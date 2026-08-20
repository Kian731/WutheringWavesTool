/* 產生「養成計劃」用的分階突破素材資料 → ../data/ascension.js
 *  角色：庫街區官方 API 的「角色突破材料」六個分頁
 *  武器：BWIKI 武器頁的 20/40/50/60/70/80 級突破材料
 *  另外輸出素材登錄表（圖示、合成家族與階級）
 */
import fs from 'fs';
import path from 'path';
import * as OpenCC from 'opencc-js';

const SITE = path.resolve('..');
const cc = OpenCC.Converter({ from: 'cn', to: 'tw' });
const FIX = [['維裡奈', '維里奈'], ['相裡要', '相里要']];
const T = s => { let t = cc(String(s == null ? '' : s)); for (const [a, b] of FIX) t = t.split(a).join(b); return t; };
const ent = s => String(s || '').replace(/&nbsp;/g, ' ').replace(/&middot;/g, '·')
  .replace(/&ldquo;/g, '「').replace(/&rdquo;/g, '」').replace(/&amp;/g, '&');

const H = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126',
  'content-type': 'application/x-www-form-urlencoded', 'wiki_type': '9', 'source': 'h5'
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const post = async (url, body) => {
  for (let a = 0; a < 5; a++) {
    try {
      const r = await fetch(url, { method: 'POST', headers: H, body: new URLSearchParams(body) });
      const t = await r.text();
      if (t.startsWith('{')) return JSON.parse(t);
    } catch (e) { }
    await sleep(1500 * (a + 1));
  }
  return null;
};

/* 簡體角色名 → 站內 id（與 build.mjs 相同） */
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
/* 站內名 → 庫街區名（漂泊者要指定性別，材料兩性相同） */
const toKuro = n => n.replace(/^漂泊者·(.+)$/, '漂泊者-女-$1');

/* 數量字串：10000 / 8k / 1w6 / 26w4 */
function qty(s) {
  s = String(s).trim().replace(/,/g, '');
  let m = s.match(/^(\d+)w(\d*)$/i); if (m) return +m[1] * 10000 + (+m[2] || 0) * 1000;
  m = s.match(/^(\d+)k(\d*)$/i); if (m) return +m[1] * 1000 + (+m[2] || 0) * 100;
  return parseInt(s, 10) || 0;
}

/* ---------- 素材登錄表 ---------- */
const raw = JSON.parse(fs.readFileSync('raw.json', 'utf8'));
const FILEMAP = JSON.parse(fs.readFileSync('filemap.json', 'utf8'));
const load = f => { const g = {}; new Function('window', fs.readFileSync(path.join(SITE, f), 'utf8'))(g); return g; };
const chars = load('data/characters.js').WW_CHARACTERS;

const MATS = {};                 // 繁體名 -> {ic, fam, tier, _url, _simp}
const downloads = [];
let seq = 0;
/* 先把角色頁已經有圖的素材登記進來，避免重複下載 */
for (const c of chars) for (const a of c.asc) if (a.ic && !MATS[a.n]) MATS[a.n] = { ic: a.ic };

function reg(simp, url) {
  const n = T(ent(simp).trim());
  if (!MATS[n]) MATS[n] = {};
  const m = MATS[n];
  if (!m.ic) {
    const cands = [`道具 ${simp}.png`, `道具 ${simp.replace(/[「」“”]/g, '')}.png`];
    const wikiUrl = cands.map(c => FILEMAP[c]).find(Boolean);
    const src = wikiUrl || url;
    if (src) { m.ic = `assets/img/item/p_${String(++seq).padStart(3, '0')}.png`; downloads.push({ url: src, out: m.ic }); }
  }
  return n;
}

/* 合成家族：3 個下階 → 1 個上階 */
const TIER_SETS = [
  ['低頻', '中頻', '高頻', '全頻'],
  ['簡陋', '基準', '改造', '特製'],
  ['惰性', '活性', '極化', '異構']
];
function famOf(n) {
  for (const set of TIER_SETS) {
    const i = set.findIndex(p => n.startsWith(p));
    if (i >= 0) return { fam: n.slice(set[i].length), tier: i, tiers: set };
  }
  return null;
}

/* ---------- 角色：庫街區分階資料 ---------- */
console.log('取得庫街區共鳴者清單…');
const listJ = await post('https://api.kurobbs.com/wiki/core/catalogue/item/getPage', { catalogueId: '1105', page: '1', limit: '200' });
const recs = listJ.data.results.records;

const ascChar = {};
let done = 0, failed = [];
for (const [simp, id] of Object.entries(ID)) {
  const kname = toKuro(simp);
  const rec = recs.find(r => r.name === kname);
  if (!rec || !rec.content || !rec.content.linkId) { failed.push(simp + '(找不到)'); continue; }
  const d = await post('https://api.kurobbs.com/wiki/core/catalogue/item/getEntryDetail', { id: rec.content.linkId });
  if (!d || !d.data) { failed.push(simp + '(取不到)'); continue; }
  let comp = null;
  for (const m of d.data.content.modules) for (const x of (m.components || [])) if (x.title === '角色突破材料') comp = x;
  if (!comp || !comp.tabs) { failed.push(simp + '(無素材表)'); continue; }
  ascChar[id] = comp.tabs.map(tb => {
    const out = [];
    const re = /<img[^>]+src="([^"]+)"[^>]*>(?:\s*<\/a>)?\s*<a[^>]*>([^<]+)<\/a>\s*x\s*([\d,]+)/g;
    let m;
    while ((m = re.exec(tb.content))) out.push({ n: reg(m[2].trim(), m[1]), q: qty(m[3]) });
    return out;
  });
  done++;
  process.stdout.write(`\r角色 ${done}/${Object.keys(ID).length}   `);
  await sleep(450);
}
console.log('\n完成', done, failed.length ? '｜失敗：' + failed.join('、') : '');

/* ---------- 武器：BWIKI 分階資料 ---------- */
const KEYS = ['20级突破材料', '40级突破材料', '50级突破材料', '60级突破材料', '70级突破材料', '80级突破材料'];
const ascWeapon = {};
let wOK = 0, wSkip = [];
for (const [simp, o] of Object.entries(raw.weapons)) {
  const name = T(o.t['名称'] || simp);
  const tiers = KEYS.map(k => (o.t[k] || '').split(',').map(s => s.trim()).filter(Boolean).map(s => {
    const [n, q] = s.split('*');
    return { n: reg(n.trim(), null), q: qty(q) };
  }));
  if (tiers.every(t => !t.length)) { wSkip.push(name); continue; }
  ascWeapon[name] = tiers; wOK++;
}
console.log('武器', wOK, wSkip.length ? '｜無資料：' + wSkip.join('、') : '');

/* ---------- 對帳校正 ----------
 * 官方 API 的分階表偶有漏項或標錯階（例：維里奈階2缺中頻聲核、釉瑚階6把特製寫成改造）。
 * BWIKI 的「突破消耗材料總數」是規律且完整的，因此以總量為準；
 * 分階加總與總量不符時，改用遊戲固定的分配比例重建該素材的分階。
 */
const SPLIT = {
  t1: [1, 0, 0, 0, 0, 0],                    // 低頻 / 簡陋
  t2: [0, 1 / 3, 2 / 3, 0, 0, 0],            // 中頻 / 基準
  t3: [0, 0, 0, 1 / 3, 2 / 3, 0],            // 高頻 / 改造
  t4: [0, 0, 0, 0, 0, 1],                    // 全頻 / 特製
  spec: [0, 4 / 60, 8 / 60, 12 / 60, 16 / 60, 20 / 60],   // 地區特產
  boss: [0, 3 / 46, 6 / 46, 9 / 46, 12 / 46, 16 / 46]     // Boss 素材
};
function ratioFor(name, total) {
  if (/^(低頻|簡陋)/.test(name)) return SPLIT.t1;
  if (/^(中頻|基準)/.test(name)) return SPLIT.t2;
  if (/^(高頻|改造)/.test(name)) return SPLIT.t3;
  if (/^(全頻|特製)/.test(name)) return SPLIT.t4;
  return total === 46 ? SPLIT.boss : SPLIT.spec;
}
let fixedRows = 0;
for (const c of chars) {
  const tiers = ascChar[c.id];
  if (!tiers) continue;
  for (const a of c.asc) {
    const want = +a.q;
    const got = tiers.reduce((s, t) => s + (t.find(x => x.n === a.n)?.q || 0), 0);
    if (got === want) continue;
    /* 先把這個素材從所有階段清掉，再依比例重建 */
    tiers.forEach(t => { const i = t.findIndex(x => x.n === a.n); if (i >= 0) t.splice(i, 1); });
    const rt = ratioFor(a.n, want);
    let left = want;
    rt.forEach((r, i) => {
      if (!r) return;
      const q = (i === rt.length - 1 || rt.slice(i + 1).every(x => !x)) ? left : Math.round(want * r);
      left -= q;
      if (q > 0) tiers[i].push({ n: a.n, q });
    });
    fixedRows++;
    console.log('  校正：', c.name, a.n, '分階加總', got, '→ 依總量', want, '重建');
  }
}
console.log('校正筆數', fixedRows);

/* ---------- 推導合成家族 ----------
 * 同系列素材命名都是「兩字前綴＋共同後綴」（低頻囈語聲核／簡陋鐐環／含雜晶化燃素…），
 * 因此以「去掉前兩字後的後綴」分組；階級順序不用寫死，改由該素材最早出現在第幾階突破推得。
 */
{
  const firstTier = {};                     // 素材 -> 最早出現的突破階
  const scan = tiers => tiers.forEach((t, i) => t.forEach(x => {
    if (firstTier[x.n] === undefined || i < firstTier[x.n]) firstTier[x.n] = i;
  }));
  Object.values(ascChar).forEach(scan);
  Object.values(ascWeapon).forEach(scan);

  const groups = {};
  for (const n of Object.keys(firstTier)) {
    if (n.length < 4) continue;             // 太短的不可能是「前綴＋後綴」
    const key = n.slice(2);
    if (key.length < 2) continue;
    (groups[key] = groups[key] || []).push(n);
  }
  let famCount = 0;
  for (const [key, arr] of Object.entries(groups)) {
    if (arr.length < 3 || arr.length > 4) continue;
    const tiersSeen = new Set(arr.map(n => firstTier[n]));
    if (tiersSeen.size !== arr.length) continue;   // 階級要能互相區分才算同一條合成線
    arr.sort((a, b) => firstTier[a] - firstTier[b]);
    arr.forEach((n, i) => { if (MATS[n]) { MATS[n].fam = key; MATS[n].tier = i; } });
    famCount++;
    console.log('  合成家族：', key, '=', arr.join(' → '));
  }
  console.log('辨識出的合成家族數', famCount);
}

/* ---------- 下載新素材圖 ---------- */
const valid = b => b.length > 400 && (b.slice(0, 8).toString('hex') === '89504e470d0a1a0a' || b.slice(0, 3).toString('hex') === 'ffd8ff' || b.slice(0, 4).toString() === 'RIFF');
let dl = 0, dlFail = 0;
for (const it of downloads) {
  const out = path.join(SITE, it.out);
  if (fs.existsSync(out) && valid(fs.readFileSync(out))) continue;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  try {
    const r = await fetch(it.url, { headers: { 'user-agent': H['user-agent'], referer: it.url.includes('biligame') ? 'https://wiki.biligame.com/wutheringwaves/' : 'https://wiki.kurobbs.com/' } });
    const b = Buffer.from(await r.arrayBuffer());
    if (valid(b)) { fs.writeFileSync(out, b); dl++; } else dlFail++;
  } catch (e) { dlFail++; }
  await sleep(90);
}
/* 下載失敗的就把 ic 拿掉，畫面會退回文字方塊 */
for (const m of Object.values(MATS)) if (m.ic && !fs.existsSync(path.join(SITE, m.ic))) delete m.ic;
console.log('素材圖：新下載', dl, '失敗', dlFail, '｜登錄素材', Object.keys(MATS).length);

/* ---------- 輸出 ---------- */
const clean = {};
for (const [n, m] of Object.entries(MATS)) {
  clean[n] = {};
  if (m.ic) clean[n].ic = m.ic;
  if (m.fam) { clean[n].fam = m.fam; clean[n].tier = m.tier; }
}
const out =
  `/* 鳴潮攻略站 — 養成計劃用：分階突破素材
 * 角色分階來源：庫街區官方 WIKI API｜武器分階來源：鳴潮 BWIKI
 * levels 為突破門檻等級；tiers[i] 對應「等級 levels[i] → 下一段上限」所需素材
 * 產生日期：${new Date().toISOString().slice(0, 10)}
 */
window.WW_ASC = ${JSON.stringify({ levels: [20, 40, 50, 60, 70, 80], caps: [20, 40, 50, 60, 70, 80, 90], chars: ascChar, weapons: ascWeapon, mats: clean })};
`;
fs.writeFileSync(path.join(SITE, 'data/ascension.js'), out);

/* 對帳：分階加總 vs 角色頁的總量 */
let mismatch = 0;
for (const c of chars) {
  const t = ascChar[c.id]; if (!t) continue;
  const sum = {};
  t.flat().forEach(x => sum[x.n] = (sum[x.n] || 0) + x.q);
  for (const a of c.asc) {
    const got = sum[a.n];
    if (got !== undefined && String(got) !== String(a.q)) {
      mismatch++;
      if (mismatch <= 6) console.log('  對不上：', c.name, a.n, '總表', a.q, 'vs 分階加總', got);
    }
  }
}
console.log('角色', Object.keys(ascChar).length, '｜武器', Object.keys(ascWeapon).length,
  '｜與總表對不上的項目', mismatch);
console.log('已寫入 data/ascension.js（' + (fs.statSync(path.join(SITE, 'data/ascension.js')).size / 1024).toFixed(0) + ' KB）');
