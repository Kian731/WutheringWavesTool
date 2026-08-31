/* 聲骸套裝（合鳴效果）自動更新 → ../data/sonatas.js
 * 效果文字來源：鳴潮助手 mc.appfeng.com/echo（會隨版本更新，出新套裝也抓得到）
 * 圖示優先用已下載的 BWIKI「声骸合鸣 X.png」，沒有才用來源站的圖
 * 既有的英文名／推薦角色／版本等人工欄位會保留
 */
import fs from 'fs';
import path from 'path';
import * as OpenCC from 'opencc-js';
import pinyin from 'tiny-pinyin';

const SITE = path.resolve('..');
const toTW = OpenCC.Converter({ from: 'cn', to: 'tw' });
const toCN = OpenCC.Converter({ from: 'tw', to: 'cn' });
const UA = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126' };
const SRC = 'https://mc.appfeng.com';

const load = f => { const g = {}; new Function('window', fs.readFileSync(path.join(SITE, f), 'utf8'))(g); return g; };
const cur = load('data/sonatas.js').WW_SONATAS;
const FILEMAP = JSON.parse(fs.readFileSync('filemap.json', 'utf8'));

const txt = h => String(h || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/\s+/g, ' ').trim();

console.log('抓取合鳴效果…');
let html = '';
for (let a = 0; a < 4 && !html; a++) {
  try {
    const r = await fetch(SRC + '/echo', { headers: UA });
    if (r.ok) html = await r.text();
  } catch (e) { }
  if (!html) await new Promise(r => setTimeout(r, 1500 * (a + 1)));
}
if (!html) { console.error('✗ 取不到來源，這一步略過（沿用現有 data/sonatas.js）'); process.exit(0); }

/* 解析：標題（圖示＋名稱）＋ N件效果 */
const found = [];
const reBlock = /<div class="title flexCenter"><img src="([^"]+)"[^>]*>\s*([^<]+)<\/div>\s*<div class="des">([\s\S]*?)<\/div>\s*<\/div>/g;
let m;
while ((m = reBlock.exec(html))) {
  const icon = m[1], name = toTW(txt(m[2]));
  const body = m[3];
  const pieces = [...body.matchAll(/<span>(\d+)件[：:]<\/span>([^<]*)/g)]
    .map(x => ({ n: +x[1], t: toTW(txt(x[2])) }));
  if (!name || !pieces.length) continue;
  found.push({ name, icon, pieces });
}
console.log('來源共有', found.length, '個套裝');
if (found.length < 10) { console.error('✗ 解析結果異常，略過以免破壞現有資料'); process.exit(0); }

/* 依 2 件效果推斷分類 */
function elOf(p2, p5) {
  const t = p2 + ' ' + p5;
  for (const e of ['冷凝', '熱熔', '導電', '氣動', '衍射', '湮滅'])
    if (new RegExp(e + '(?:屬性)?傷害提升').test(p2)) return e;
  if (/治療效果提升/.test(p2)) return '治療';
  if (/共鳴效率提升/.test(p2)) return /協同攻擊/.test(t) ? '協同' : '通用';
  if (/生命提升/.test(p2)) return /護盾/.test(t) ? '護盾' : '通用';
  if (/共鳴技能傷害提升/.test(p2)) return '冷凝';
  if (/護盾/.test(t)) return '護盾';
  return '通用';
}
const slug = n => pinyin.convertToPinyin(n, '', true).toLowerCase().replace(/[^a-z0-9]/g, '-')
  .replace(/-+/g, '-').replace(/^-|-$/g, '');

const byName = {};
cur.forEach(s => byName[s.cn] = s);

const out = [];
const added = [], updated = [];
for (const f of found) {
  const old = byName[f.name];
  const two = f.pieces.find(p => p.n === 2);
  const five = f.pieces.find(p => p.n === 5) || f.pieces[f.pieces.length - 1];
  const only = f.pieces.length === 1 ? f.pieces[0] : null;
  const p2 = two ? two.t : (only ? '—（' + only.n + ' 件套裝）' : '—');
  const p5 = five ? five.t : '';
  const pieces = two ? '2 / 5' : (only ? only.n + ' 件套' : f.pieces.map(p => p.n).join(' / ') + ' 件');

  /* 圖示：優先用已下載的 BWIKI 圖 */
  let ic = old && old.ic ? old.ic : null;
  if (!ic) {
    const wikiFile = '声骸合鸣 ' + toCN(f.name) + '.png';
    if (FILEMAP[wikiFile]) ic = 'assets/img/sonata/' + (old ? old.id : slug(f.name)) + '.png';
  }
  const rec = {
    id: old ? old.id : slug(f.name),
    cn: f.name,
    en: old ? old.en : '',
    el: old ? old.el : elOf(p2, p5),
    pieces: old && /件/.test(old.pieces) && !two ? old.pieces : pieces,
    ver: old ? old.ver : '新增',
    ic: ic,
    p2, p5,
    '用於': old ? old['用於'] : '—',
    _srcIcon: f.icon
  };
  if (!old) added.push(f.name);
  else if (old.p2 !== p2 || old.p5 !== p5) updated.push(f.name);
  out.push(rec);
}

/* 來源沒列到、但站上原本就有的套裝仍保留 */
for (const s of cur) if (!out.some(o => o.cn === s.cn)) out.push(s);

/* 需要補下載的圖示 */
const dl = [];
for (const s of out) {
  if (s.ic && fs.existsSync(path.join(SITE, s.ic))) { delete s._srcIcon; continue; }
  const wikiFile = '声骸合鸣 ' + toCN(s.cn) + '.png';
  const url = FILEMAP[wikiFile] || (s._srcIcon ? SRC + s._srcIcon : null);
  if (url) { s.ic = 'assets/img/sonata/' + s.id + '.png'; dl.push({ url, out: s.ic }); }
  else s.ic = null;
  delete s._srcIcon;
}
const valid = b => b.length > 300 && (b.slice(0, 8).toString('hex') === '89504e470d0a1a0a' || b.slice(0, 3).toString('hex') === 'ffd8ff' || b.slice(0, 4).toString() === 'RIFF');
let got = 0;
for (const it of dl) {
  const p = path.join(SITE, it.out);
  if (fs.existsSync(p) && valid(fs.readFileSync(p))) continue;
  try {
    const r = await fetch(it.url, { headers: { ...UA, referer: it.url.includes('biligame') ? 'https://wiki.biligame.com/wutheringwaves/' : SRC + '/' } });
    const b = Buffer.from(await r.arrayBuffer());
    if (valid(b)) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, b); got++; }
  } catch (e) { }
  await new Promise(r => setTimeout(r, 120));
}
for (const s of out) if (s.ic && !fs.existsSync(path.join(SITE, s.ic))) s.ic = null;

const hdr = `/* 鳴潮攻略站 — 聲骸套裝（合鳴效果）
 * 效果文字自 鳴潮助手（mc.appfeng.com）自動更新；圖示取自 鳴潮 BWIKI
 * 推薦角色等人工欄位會沿用，不會被覆蓋
 * 產生日期：${new Date().toISOString().slice(0, 10)}
 */\n`;
fs.writeFileSync(path.join(SITE, 'data/sonatas.js'), hdr + 'window.WW_SONATAS = ' + JSON.stringify(out) + ';\n');

console.log('套裝總數', out.length, '｜新下載圖示', got);
if (added.length) console.log('★ 新套裝：' + added.join('、') + '（推薦角色欄位需人工補）');
if (updated.length) console.log('效果有變動：' + updated.join('、'));
if (!added.length && !updated.length) console.log('沒有新套裝，效果也沒變。');
