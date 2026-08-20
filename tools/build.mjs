import fs from 'fs';
import path from 'path';
import * as OpenCC from 'opencc-js';

const SITE = path.resolve('..');
const cc = OpenCC.Converter({ from: 'cn', to: 'tw' });
/* OpenCC 會把專有名詞裡的「里」誤轉成「裡」，這裡列出需要保留原字的詞 */
const FIX = [['維裡奈', '維里奈'], ['相裡要', '相里要'], ['公裡', '公里'], ['裡程', '里程']];
const T = s => { let t = cc(String(s == null ? '' : s)); for (const [a, b] of FIX) t = t.split(a).join(b); return t; };

const raw = JSON.parse(fs.readFileSync('raw.json', 'utf8'));
const FILEMAP = JSON.parse(fs.readFileSync('filemap.json', 'utf8'));
const PAGEMAP = JSON.parse(fs.readFileSync('pagemap.json', 'utf8'));
const ANY = {};
for (const m of Object.values(PAGEMAP)) for (const [k, v] of Object.entries(m)) if (!ANY[k]) ANY[k] = v;

/* ---------- 圖片解析：候選檔名 → CDN 網址 ---------- */
const IMAGES = []; const seenOut = new Set();
function img(page, cands, out) {
  const pm = PAGEMAP[page] || {};
  let url = null;
  for (const c of cands) if (pm[c]) { url = pm[c]; break; }
  if (!url) for (const c of cands) if (FILEMAP[c]) { url = FILEMAP[c]; break; }
  if (!url) for (const c of cands) if (ANY[c]) { url = ANY[c]; break; }
  if (!url) return null;
  if (!seenOut.has(out)) { seenOut.add(out); IMAGES.push({ url, out }); }
  return out;
}
let itemSeq = 0; const ITEM_MAP = {};
function itemIcon(cn, page) {
  if (ITEM_MAP[cn] !== undefined) return ITEM_MAP[cn];
  const out = `assets/img/item/${String(++itemSeq).padStart(3, '0')}.png`;
  const cands = [`道具 ${cn}.png`, `道具 ${cn.replace(/[“”"]/g, '')}.png`, `${cn}.png`];
  ITEM_MAP[cn] = img(page, cands, out);
  return ITEM_MAP[cn];
}

/* ---------- 簡體名 → 站內 id ---------- */
const ID = {
  '白芷': 'baizhi', '炽霞': 'chixia', '鉴心': 'jianxin', '安可': 'encore', '丹瑾': 'danjin',
  '忌炎': 'jiyan', '卡卡罗': 'calcharo', '今汐': 'jinhsi', '灯灯': 'lumi', '椿': 'camellya',
  '菲比': 'phoebe', '布兰特': 'brant', '弗洛洛': 'phrolova', '奥古斯塔': 'augusta',
  '嘉贝莉娜': 'galbrena', '仇远': 'qiuyuan', '卜灵': 'buling', '绯雪': 'hiyuki',
  '爱弥斯': 'aemeath', '达妮娅': 'denia', '漂泊者·衍射': 'rover-spectro', '散华': 'sanhua',
  '秋水': 'aalto', '漂泊者·湮灭': 'rover-havoc', '莫特斐': 'mortefi', '凌阳': 'lingyang',
  '珂莱塔': 'carlotta', '洛可可': 'roccia', '坎特蕾拉': 'cantarella', '漂泊者·气动': 'rover-aero',
  '露帕': 'lupa', '卡提希娅': 'cartethyia', '千咲': 'chisa', '露西': 'lucy', '琳奈': 'lynae',
  '莫宁': 'mornye', '陆·赫斯': 'luuk-herssen', '丽贝卡': 'rebecca', '洛瑟菈': 'lucilla',
  '漂泊者·导电': 'rover-electro', '秧秧': 'yangyang', '桃祈': 'taoqi', '维里奈': 'verina',
  '渊武': 'yuanwu', '吟霖': 'yinlin', '长离': 'changli', '相里要': 'xiangli-yao',
  '折枝': 'zhezhi', '守岸人': 'shorekeeper', '釉瑚': 'youhu', '赞妮': 'zani', '夏空': 'ciaccona',
  '尤诺': 'iuno', '西格莉卡': 'sigrika', '秧秧·玄翎': 'yangyang-xuanling', '穗穗': 'suisui'
};

/* ---------- 讀入備份中我手寫的欄位 ---------- */
const load = f => { const g = {}; new Function('window', fs.readFileSync(path.join(SITE, f), 'utf8'))(g); return g; };
const gb = load('data/backup/characters.js');
const CUR = {}, HEAD_FALLBACK = {};
for (const c of gb.WW_CHARACTERS) {
  CUR[c.id] = { en: c.en, g: c.g, role: c.role, tier: c.tier, ver: c.ver, buff: c.buff, panel: c.panel, build: c.build, sub: c.sub, note: c.note };
  HEAD_FALLBACK[c.id] = gb.WW_ICON_BASE + c.icon;
}
const WOWN = {};
for (const x of load('data/backup/weapons.js').WW_WEAPONS) if (x.own && x.own !== '—') WOWN[x.n] = x.own;
const SON = load('data/backup/sonatas.js').WW_SONATAS;
const ECHO_EN = {};
for (const e of load('data/backup/echoes.js').WW_ECHOES) if (e.cn) ECHO_EN[e.cn] = e.en;

/* ---------- wikitext → HTML ---------- */
function clean(s, selfName) {
  if (!s) return '';
  let t = String(s);
  t = t.replace(/\{\{SUBPAGENAME\}\}/g, selfName || '');
  t = t.replace(/\{\{当前用户\|昵称\}\}/g, '漂泊者').replace(/\{\{性别\}\}/g, 'ta');
  for (let i = 0; i < 6; i++) t = t.replace(/\{\{颜色\|[^|{}]*\|([^{}]*?)\}\}/g, '<em>$1</em>');
  t = t.replace(/\{\{[^{}]*\}\}/g, '');
  t = t.replace(/'''(.*?)'''/g, '<b>$1</b>').replace(/''(.*?)''/g, '<i>$1</i>');
  t = t.replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1').replace(/\[\[([^\]]*)\]\]/g, '$1');
  t = t.replace(/<br\s*\/?>/gi, '<br>');
  t = t.replace(/\n{2,}/g, '<br>').replace(/\n/g, ' ');
  t = t.replace(/造成造成/g, '造成').replace(/  +/g, ' ');
  return T(t.trim());
}

/* ---------- 屬性 / 武器類型 圖示 ---------- */
for (const k of ['冷凝', '热熔', '导电', '气动', '衍射', '湮灭'])
  img('', [`属性 彩 ${k}.png`, `属性 ${k}.png`], `assets/img/element/${T(k)}.png`);
for (const k of ['长刃', '迅刀', '佩枪', '臂铠', '音感仪'])
  img('', [`${k}.png`, `武器类型 ${k}.png`], `assets/img/wtype/${T(k)}.png`);

/* ---------- 角色 ---------- */
const SK = [
  ['常态攻击', '常態攻擊', 'basic'], ['共鸣技能', '共鳴技能', 'skill'], ['共鸣回路', '共鳴迴路', 'forte'],
  ['共鸣解放', '共鳴解放', 'ult'], ['变奏技能', '變奏技能', 'intro'], ['延奏技能', '延奏技能', 'outro'],
  ['固有技能1', '固有技能一', 'passive1'], ['固有技能2', '固有技能二', 'passive2']
];

const chars = [];
for (const [cn, c] of Object.entries(raw.chars)) {
  const id = ID[cn]; if (!id) continue;
  const page = '共鸣者/' + cn;
  const b = c.base, st = c.stats || {}, sk = c.skills || {}, ch = c.chains || {};
  const cur = CUR[id] || {};

  const skills = [];
  for (const [k, label, slug] of SK) {
    if (!sk[k]) continue;
    let ic;
    if (k === '常态攻击') ic = `assets/img/wtype/${T(b['武器'])}.png`;
    else ic = img(page, [`技能 ${cn} ${k}.png`], `assets/img/skill/${id}_${slug}.png`);
    skills.push({ k: label, name: T(sk[k]), desc: clean(sk[k + '描述'], cn), ic });
  }
  const chains = [];
  for (let i = 1; i <= 6; i++) {
    if (!ch['共鸣链' + i]) continue;
    chains.push({
      n: i, name: T(ch['共鸣链' + i]), desc: clean(ch['共鸣链' + i + '描述'], cn),
      ic: img(page, [`${cn}共鸣链${i}.png`, `角色 ${cn} 共鸣链${i}.png`], `assets/img/chain/${id}_${i}.png`)
    });
  }
  /* 敵人掉落素材的總量在遊戲裡固定是 低4／中12／高12／全4，
     BWIKI 偶有手誤（例：忌炎高頻寫成 4），這裡以通則校正並記錄。 */
  const CORE_Q = [[/^(低频|简陋)/, '4'], [/^(中频|基准)/, '12'], [/^(高频|改造)/, '12'], [/^(全频|特制)/, '4']];
  const asc = (st['突破消耗材料总数'] || '').split(',').filter(Boolean).map(s => {
    const [n0, q0] = s.split('*');
    const n = n0.trim();
    let q = (q0 || '').trim();
    const rule = CORE_Q.find(([re]) => re.test(n));
    if (rule && q !== rule[1]) { console.log('  素材總量校正：', cn, T(n), q, '→', rule[1]); q = rule[1]; }
    return { n: T(n), q, ic: itemIcon(n, page) };
  });

  let icon = img(page, [`角色 ${cn} 头像.png`], `assets/img/char/${id}.png`);
  if (!icon && HEAD_FALLBACK[id]) {
    const out = `assets/img/char/${id}.png`;
    if (!seenOut.has(out)) { seenOut.add(out); IMAGES.push({ url: HEAD_FALLBACK[id], out }); }
    icon = out;
  }

  chars.push({
    id, name: T(cn), en: cur.en || T(b['英文名'] || ''),
    r: +b['品质'], el: T(b['属性']), wp: T(b['武器']),
    g: cur.g || '—', role: cur.role || ['—'], region: T(b['势力'] || '—'),
    ver: cur.ver || '', tier: cur.tier || '',
    icon, art: img(page, [`角色 ${cn} 立绘.png`], `assets/img/art/${id}.png`),
    elIc: `assets/img/element/${T(b['属性'])}.png`,
    wpIc: `assets/img/wtype/${T(b['武器'])}.png`,
    ability: T(b['共鸣能力'] || ''), intro: clean(b['简介'], cn),
    birth: T(b['生日'] || '—'), food: T(b['特殊料理'] || '—'),
    date: b['实装日期'] || '',
    style: (b['战斗风格'] || '').split(',').filter(Boolean).map(T),
    s90: { hp: st['90生命'] || '', atk: st['90攻击'] || '', def: st['90防御'] || '' },
    s1: { hp: st['生命'] || '', atk: st['攻击'] || '', def: st['防御'] || '' },
    feature: clean(sk['战斗特色'], cn),
    buff: cur.buff || '—', panel: cur.panel || {}, build: cur.build || {},
    sub: cur.sub || [], note: cur.note || '',
    asc, skills, chains
  });
}
chars.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

/* ---------- 武器 ---------- */
let wSeq = 0;
const weapons = Object.values(raw.weapons).map(w => {
  const t = w.t, n = t['名称'], page = '武器/' + n;
  return {
    n: T(n), r: +t['品质'], t: T(t['类型']),
    sub: T(t['副词条'] || '—'), atk: t['90级攻击'] || '', subv: t['90级词条数值'] || '',
    atk0: t['初始攻击'] || '', subv0: t['词条初始数值'] || '',
    effName: T(t['武器技能'] || ''), eff: clean(t['技能描述'], n),
    src: T(t['获取途径'] || '—'), story: clean(t['武器故事'], n),
    ver: t['实装版本'] || '', own: '',
    ic: img(page, [`武器 ${n}.png`, `Mc wiki weapon ${n}.png`], `assets/img/weapon/${String(++wSeq).padStart(3, '0')}.png`),
    wpIc: `assets/img/wtype/${T(t['类型'])}.png`
  };
}).filter(x => x.n && x.t && x.r).sort((a, b) => b.r - a.r || a.t.localeCompare(b.t, 'zh'));

/* ---------- 聲骸 ---------- */
let eSeq = 0;
const echoes = Object.values(raw.echoes).map(e => {
  const t = e.t, n = t['名称'] || e.name, page = '声骸/' + e.name;
  const sets = (t['所属套装'] || '').split(/[,，、\/]/).map(s => s.trim()).filter(Boolean).map(T);
  const skillKey = Object.keys(t).find(k => /声骸技能$/.test(k));
  const idx = String(++eSeq).padStart(3, '0');
  return {
    cn: T(n), en: ECHO_EN[T(n)] || '', c: +t['COST花费'] || 0, s: sets,
    danger: T(t['危险度'] || ''), no: t['编号'] || '',
    skill: clean(t[skillKey], n), cd: t['技能冷却'] || '',
    ic: img(page, [`声骸 ${n} 头像.png`, `声骸 ${n}.png`], `assets/img/echo/${idx}.png`)
  };
}).filter(e => e.cn && e.c && !/預設|预设/.test(e.cn)).sort((a, b) => b.c - a.c || a.cn.localeCompare(b.cn, 'zh'));

/* ---------- 套裝 ---------- */
const SET_SIM = {};
Object.values(raw.echoes).forEach(e => (e.t['所属套装'] || '').split(/[,，、\/]/).forEach(s => {
  s = s.trim(); if (s) SET_SIM[T(s)] = s;
}));
const sonatas = SON.map(s => {
  const sim = SET_SIM[s.cn];
  const { ic, ...rest } = s;
  return { ...rest, ic: sim ? img('', [`声骸合鸣 ${sim}.png`], `assets/img/sonata/${s.id}.png`) : null };
});

/* ---------- 由角色配裝推薦反推武器適配角色 ---------- */
for (const wp of weapons) {
  const users = chars.filter(c => c.wp === wp.t && (c.build && c.build.weapon || '').indexOf(wp.n) >= 0);
  wp.own = users.map(c => c.name).join('、');
}

/* ---------- 以 wuthering.gg 備援圖補洞 ---------- */
if (fs.existsSync('supp.json')) {
  const S = JSON.parse(fs.readFileSync('supp.json', 'utf8'));
  const put = out => { const u = S.images[out]; if (u && !seenOut.has(out)) { seenOut.add(out); IMAGES.push({ url: u, out }); } return u ? out : null; };
  for (const c of chars) {
    if (!c.art) c.art = put(`assets/img/art/${c.id}.png`);
    c.chains.forEach(ch => { if (!ch.ic) ch.ic = put(`assets/img/chain/${c.id}_${ch.n}.png`); });
    const SLUG = { '共鳴技能': 'skill', '共鳴迴路': 'forte', '共鳴解放': 'ult', '變奏技能': 'intro', '延奏技能': 'outro', '固有技能一': 'passive1', '固有技能二': 'passive2' };
    c.skills.forEach(s => { if (!s.ic && SLUG[s.k]) s.ic = put(`assets/img/skill/${c.id}_${SLUG[s.k]}.png`); });
    c.asc.forEach((a, i) => { if (!a.ic && S.charItem[c.id + '|' + i]) a.ic = put(S.charItem[c.id + '|' + i]); });
  }
  for (const e of echoes) if (!e.ic && S.echoIc[e.cn]) e.ic = put(S.echoIc[e.cn]);
}

/* ---------- 輸出 ---------- */
const hdr = t => `/* 鳴潮攻略站 — ${t}
 * 由 tools/ 下的腳本自 鳴潮 BWIKI（wiki.biligame.com）自動產生，簡體原文以 OpenCC 轉繁
 * 配裝／畢業面板／有效詞條／定位／隊伍增益為人工整理
 * 產生日期：${new Date().toISOString().slice(0, 10)}
 */\n`;
fs.writeFileSync(path.join(SITE, 'data/characters.js'), hdr('全角色資料') + 'window.WW_CHARACTERS = ' + JSON.stringify(chars) + ';\n');
fs.writeFileSync(path.join(SITE, 'data/weapons.js'), hdr('武器圖鑒') + 'window.WW_WEAPONS = ' + JSON.stringify(weapons) + ';\n');
fs.writeFileSync(path.join(SITE, 'data/echoes.js'), hdr('聲骸資料') + 'window.WW_ECHOES = ' + JSON.stringify(echoes) + ';\n');
fs.writeFileSync(path.join(SITE, 'data/sonatas.js'), hdr('聲骸套裝') + 'window.WW_SONATAS = ' + JSON.stringify(sonatas) + ';\n');
fs.writeFileSync('images.json', JSON.stringify(IMAGES));

const miss = {
  art: chars.filter(c => !c.art).map(c => c.name),
  icon: chars.filter(c => !c.icon).map(c => c.name),
  chain: chars.filter(c => c.chains.some(x => !x.ic)).map(c => c.name),
  skill: chars.filter(c => c.skills.some(x => !x.ic)).map(c => c.name),
  item: Object.entries(ITEM_MAP).filter(([, v]) => !v).map(([k]) => k),
  weapon: weapons.filter(w => !w.ic).map(w => w.n),
  echo: echoes.filter(e => !e.ic).map(e => e.cn),
  sonata: sonatas.filter(s => !s.ic).map(s => s.cn)
};
console.log('角色', chars.length, '武器', weapons.length, '聲骸', echoes.length, '套裝', sonatas.length);
console.log('待下載圖片', IMAGES.length);
for (const [k, v] of Object.entries(miss)) console.log('缺' + k, v.length, v.slice(0, 12).join('、'));
