/* 由技能／共鳴鏈／武器技能／套裝效果的文字，推導出可篩選的分類標籤
 * 產生欄位：
 *   角色 buffTags[]（可提供的增益）、dmgTags[]（輸出來源＋成長屬性）、scale
 *   武器 fx[]（功能效果，含自身／隊伍範圍）、fxText
 *   套裝 pieceTag、p2Tag、fxTags[]
 * 這支可以重複執行，不會累加重複資料。
 */
import fs from 'fs';
import path from 'path';

const SITE = path.resolve('..');
const load = f => { const g = {}; new Function('window', fs.readFileSync(path.join(SITE, f), 'utf8'))(g); return g; };
const strip = s => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, '');

/* ============ 角色 ============ */
const TEAM_RE = /隊伍中(?:登場|的)?角色|隊伍中所有角色|附近隊伍(?:中)?(?:所有)?角色|全隊|下一(?:位|個)登場(?:的)?角色|隊伍中除|附近隊伍|隊伍內|友方|隊友/;

/* 增益類型：關鍵字 → 標籤 */
const BUFF_RULES = [
  ['全隊增傷', /全(?:部)?傷害加深|所有屬性傷害加深|全屬性傷害(?:加成|加深)|傷害加深\d|傷害加深提升/],
  ['屬性增傷', /(?:冷凝|熱熔|導電|氣動|衍射|湮滅)傷害(?:加成提升|加深|提升)/],
  ['技能增傷', /(?:普攻|重擊|共鳴技能|共鳴解放|聲骸技能|協同攻擊)傷害(?:加成提升|加深|提升)/],
  ['攻擊提升', /攻擊(?:力)?提升|攻擊\+|攻擊額外提升/],
  ['暴擊提升', /暴擊(?:率)?提升|暴擊傷害提升/],
  ['減抗', /抗性(?:降低|減少|下降)|無視.{0,6}抗性|抗性(?:.{0,4})?降低/],
  ['治療', /回復.{0,8}生命|治療(?:效果)?提升|提供治療|生命值/],
  ['護盾', /護盾/],
  ['充能', /共鳴能量|協奏能量|共鳴效率提升/],
  ['減傷抗打斷', /減傷|傷害減免|抗打斷|受到的傷害降低/],
  ['諧度破壞', /諧度破壞增幅|諧度破壞/]
];

/* 輸出來源 */
const DMG_SRC = [
  ['普攻', /普攻傷害/g],
  ['重擊', /重擊傷害/g],
  ['共鳴技能', /共鳴技能傷害/g],
  ['共鳴解放', /共鳴解放傷害/g],
  ['聲骸技能', /聲骸技能/g],
  ['協同攻擊', /協同攻擊/g]
];
/* 官方戰鬥風格 → 輸出來源 */
const STYLE2SRC = {
  '普攻傷害': '普攻', '重擊傷害': '重擊', '共鳴技能傷害': '共鳴技能',
  '共鳴解放傷害': '共鳴解放', '聲骸技能傷害': '聲骸技能', '協同攻擊': '協同攻擊'
};

function sentences(t) { return String(t || '').split(/[。；;<br>]+/).filter(Boolean); }

function classifyChar(c) {
  const skillTxt = c.skills.map(s => s.desc).join('。');
  const chainTxt = c.chains.map(s => s.desc).join('。');
  const whole = strip(skillTxt + '。' + chainTxt);

  /* --- 增益：只看含「隊伍字眼」的句子 --- */
  const teamSents = sentences(skillTxt + '。' + chainTxt).map(strip).filter(s => TEAM_RE.test(s));
  const buff = [];
  for (const [tag, re] of BUFF_RULES) if (teamSents.some(s => re.test(s))) buff.push(tag);
  /* 手寫的隊伍增益摘要也納入判斷（補足 wiki 敘述沒寫清楚的） */
  if (c.buff && c.buff !== '—') {
    const b = strip(c.buff);
    for (const [tag, re] of BUFF_RULES) if (!buff.includes(tag) && re.test(b)) buff.push(tag);
  }
  c.buffTags = buff.length ? buff : ['無隊伍增益'];

  /* --- 輸出來源 --- */
  const counts = {};
  for (const [tag, re] of DMG_SRC) counts[tag] = (whole.match(re) || []).length;
  const max = Math.max(...Object.values(counts));
  const src = new Set();
  if (max >= 2) for (const [tag] of DMG_SRC) if (counts[tag] >= Math.max(2, max * 0.35)) src.add(tag);
  for (const s of (c.style || [])) if (STYLE2SRC[s]) src.add(STYLE2SRC[s]);

  /* --- 成長屬性 --- */
  const hp = (whole.match(/生命上限/g) || []).length;
  const def = (whole.match(/防禦力的|防禦提升|自身防禦/g) || []).length;
  c.scale = hp >= 2 ? '生命' : (def >= 3 ? '防禦' : '攻擊');
  c.dmgTags = [...src, c.scale + '成長'];
  if (src.size === 0) c.dmgTags.unshift('綜合');
  /* 純輔助不列輸出來源 */
  if (c.role.every(r => /輔助/.test(r)) && src.size === 0) c.dmgTags = ['輔助向', c.scale + '成長'];
  return c;
}

/* ============ 武器 ============ */
const WFX_RULES = [
  ['攻擊提升', /攻擊(?:力)?提升|攻擊\+/],
  ['暴擊', /暴擊/],
  ['傷害加成', /傷害加成提升|傷害加深|傷害提升/],
  ['無視防禦', /無視.{0,8}防禦/],
  ['治療', /治療|回復.{0,6}生命/],
  ['共鳴效率', /共鳴效率|共鳴能量|協奏能量/],
  ['護盾', /護盾/],
  ['減抗', /抗性(?:降低|減少)|無視.{0,6}抗性/]
];
function classifyWeapon(w) {
  const t = strip(w.eff);
  const teamSents = sentences(w.eff).map(strip).filter(s => TEAM_RE.test(s));
  const fx = [];
  const selfFx = [], teamFx = [];
  for (const [tag, re] of WFX_RULES) {
    if (teamSents.some(s => re.test(s))) teamFx.push(tag);
    else if (re.test(t)) selfFx.push(tag);
  }
  if (teamFx.length) fx.push('隊伍增益');
  if (selfFx.length) fx.push('自身增益');
  fx.push(...new Set([...teamFx, ...selfFx]));
  w.fx = fx.length ? fx : ['無特殊效果'];
  w.fxText = [
    teamFx.length ? '隊伍：' + teamFx.join('、') : '',
    selfFx.length ? '自身：' + selfFx.join('、') : ''
  ].filter(Boolean).join('　·　') || '—';
  return w;
}

/* ============ 聲骸套裝 ============ */
function classifySonata(s) {
  s.pieceTag = /1\s*件/.test(s.pieces) ? '1 件套' : (/3\s*件/.test(s.pieces) ? '3 件套' : '2／5 件套');

  const p2 = strip(s.p2);
  s.p2Tag =
    /治療效果/.test(p2) ? '治療效果' :
      /共鳴效率/.test(p2) ? '共鳴效率' :
        /攻擊提升/.test(p2) ? '攻擊' :
          /生命提升/.test(p2) ? '生命' :
            /共鳴技能傷害/.test(p2) ? '共鳴技能傷害' :
              /(?:冷凝|熱熔|導電|氣動|衍射|湮滅)傷害提升/.test(p2) ? '屬性傷害' : '無 2 件效果';

  const p5 = strip(s.p5);
  const team = sentences(s.p5).map(strip).filter(x => TEAM_RE.test(x));
  const tags = [];
  if (team.length) tags.push('隊伍增益'); else tags.push('自身增益');
  if (/暴擊/.test(p5)) tags.push('暴擊提升');
  if (/攻擊提升|攻擊額外提升/.test(p5)) tags.push('攻擊提升');
  if (/(?:冷凝|熱熔|導電|氣動|衍射|湮滅)傷害(?:提升|加成)/.test(p5)) tags.push('屬性增傷');
  if (/全屬性傷害|全傷害加深|傷害加深/.test(p5)) tags.push('全傷害加深');
  if (/(?:普攻|重擊|共鳴技能|共鳴解放|聲骸技能|延奏技能|協同攻擊)傷害/.test(p5)) tags.push('技能增傷');
  if (/諧度破壞增幅/.test(p5)) tags.push('諧度破壞');
  if (/護盾/.test(p5)) tags.push('護盾相關');
  s.fxTags = tags;
  return s;
}

/* ============ 新角色的人工欄位自動補值 ============
 * 新角色還沒有人工整理的定位／增益摘要／畢業面板／詞條，
 * 這裡依技能文字與分類標籤自動給一組合理預設，並標記 auto，頁面上會註明。
 */
const PANEL_BY_ROLE = {
  '主C': { '攻擊': '≥ 2,300', '暴擊率': '≥ 70%', '暴擊傷害': '≥ 240%', '屬性傷害加成': '≥ 60%' },
  '副C': { '攻擊': '≥ 2,100', '暴擊率': '≥ 65%', '暴擊傷害': '≥ 210%', '共鳴效率': '≥ 120%' },
  '增傷輔助': { '攻擊': '≥ 2,000', '共鳴效率': '≥ 130%', '暴擊率': '≥ 60%' },
  '治療輔助': { '生命': '≥ 14,000', '共鳴效率': '≥ 150%', '治療效果': '≥ 55%' },
  '護盾輔助': { '防禦': '≥ 2,000', '共鳴效率': '≥ 130%', '生命': '≥ 13,000' }
};
const SUB_BY_ROLE = {
  '主C': ['暴擊率', '暴擊傷害', '攻擊%', '對應技能傷害加成'],
  '副C': ['暴擊率', '暴擊傷害', '攻擊%', '共鳴效率'],
  '增傷輔助': ['共鳴效率', '攻擊%', '暴擊率'],
  '治療輔助': ['共鳴效率', '生命%', '治療效果加成'],
  '護盾輔助': ['共鳴效率', '防禦%', '生命%']
};
function autofill(c) {
  const noRole = !c.role || !c.role.length || c.role[0] === '—';
  const noBuff = !c.buff || c.buff === '—';
  const noPanel = !c.panel || !Object.keys(c.panel).length;
  const noSub = !c.sub || !c.sub.length;
  if (!noRole && !noBuff && !noPanel && !noSub) return false;

  const b = c.buffTags || [], d = c.dmgTags || [];
  let role;
  if (b.includes('治療')) role = '治療輔助';
  else if (b.includes('護盾') && d.includes('輔助向')) role = '護盾輔助';
  else if (d.includes('輔助向')) role = '增傷輔助';
  else if (b.includes('全隊增傷') || b.includes('技能增傷')) role = '副C';
  else role = '主C';

  if (noRole) c.role = [role];
  if (noPanel) {
    const p = Object.assign({}, PANEL_BY_ROLE[role]);
    if (p['屬性傷害加成']) { p[c.el + '傷害加成'] = p['屬性傷害加成']; delete p['屬性傷害加成']; }
    c.panel = p;
  }
  if (noSub) c.sub = (SUB_BY_ROLE[role] || SUB_BY_ROLE['主C']).slice();
  if (noBuff) {
    const outro = (c.skills || []).find(s => s.k === '延奏技能');
    c.buff = outro && outro.desc
      ? '延奏技能《' + outro.name + '》：' + strip(outro.desc).slice(0, 120)
      : (b.length && b[0] !== '無隊伍增益' ? '技能可提供：' + b.join('、') : '無明顯隊伍增益');
  }
  c.auto = 1;
  return true;
}

/* ============ 執行 ============ */
const cg = load('data/characters.js');
cg.WW_CHARACTERS.forEach(classifyChar);
const filled = cg.WW_CHARACTERS.filter(autofill).map(c => c.name);
if (filled.length) console.log('★ 自動補值的新角色：' + filled.join('、') + '（定位／增益摘要／畢業面板／詞條為系統推估）');
const wg = load('data/weapons.js');
wg.WW_WEAPONS.forEach(classifyWeapon);
const sg = load('data/sonatas.js');
sg.WW_SONATAS.forEach(classifySonata);

function save(file, varName, data) {
  const src = fs.readFileSync(path.join(SITE, file), 'utf8');
  const hdr = src.split('window.' + varName)[0];
  fs.writeFileSync(path.join(SITE, file), hdr + 'window.' + varName + ' = ' + JSON.stringify(data) + ';\n');
}
save('data/characters.js', 'WW_CHARACTERS', cg.WW_CHARACTERS);
save('data/weapons.js', 'WW_WEAPONS', wg.WW_WEAPONS);
save('data/sonatas.js', 'WW_SONATAS', sg.WW_SONATAS);

/* 統計 */
const tally = (arr, key) => {
  const m = {};
  arr.forEach(x => (x[key] || []).forEach(t => m[t] = (m[t] || 0) + 1));
  return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + '(' + v + ')').join('、');
};
console.log('角色 增益能力:', tally(cg.WW_CHARACTERS, 'buffTags'));
console.log('角色 輸出來源:', tally(cg.WW_CHARACTERS, 'dmgTags'));
console.log('武器 功能效果:', tally(wg.WW_WEAPONS, 'fx'));
console.log('套裝 件數:', [...new Set(sg.WW_SONATAS.map(s => s.pieceTag))].join('、'));
console.log('套裝 2件效果:', [...new Set(sg.WW_SONATAS.map(s => s.p2Tag))].join('、'));
console.log('套裝 增益效果:', tally(sg.WW_SONATAS, 'fxTags'));
