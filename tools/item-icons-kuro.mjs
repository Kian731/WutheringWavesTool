/* 補齊 BWIKI 沒有的素材圖示 —— 改用庫街區官方 WIKI
 *
 * 先跑 item-icons.mjs（BWIKI 同名圖），再跑這一支補剩下的。
 *
 * 為什麼這個來源可信：庫街區的突破材料表裡，圖片和名稱在同一段 HTML
 * （<img src="…"> 後面緊接 <a>素材名</a> x數量），是同一個 match 抓下來的，
 * 名字與圖檔天生綁在一起，不會像編號檔名那樣對錯。
 * 對不上的一樣不給圖示。
 *
 * 用法： cd tools && node item-icons-kuro.mjs
 */
import fs from 'fs';
import { loadAsc, saveAsc } from './asc-io.mjs';
import path from 'path';
import crypto from 'crypto';
import * as OpenCC from 'opencc-js';
import { idMapFor } from './ids.mjs';

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

const A = loadAsc();
const MATS = A.mats;
const missing = Object.keys(MATS).filter(n => !MATS[n].ic);
console.log('目前沒有圖示的素材', missing.length, '種');
if (!missing.length) process.exit(0);

/* ---------- 掃庫街區的突破材料表，收集「名稱 ↔ 圖檔」配對 ---------- */
const raw = JSON.parse(fs.readFileSync('raw.json', 'utf8'));
const ID = idMapFor(Object.keys(raw.chars).filter(n => !/預設|预设|:/.test(n)));
const toKuro = n => n.replace(/^漂泊者·(.+)$/, '漂泊者-女-$1');

console.log('取得庫街區共鳴者清單…');
const listJ = await post('https://api.kurobbs.com/wiki/core/catalogue/item/getPage', { catalogueId: '1105', page: '1', limit: '200' });
const recs = ((listJ || {}).data || {}).results ? listJ.data.results.records : [];
const byName = {};
for (const r of recs) byName[r.name] = r;

/* 同一個名稱可能出現多次，記下每個來源網址出現幾次，取最多的那個 */
const pairs = {};                // 繁體素材名 -> { url: 次數 }
const RE = /<img[^>]+src="([^"]+)"[^>]*>(?:\s*<\/a>)?\s*<a[^>]*>([^<]+)<\/a>\s*x\s*([\d,]+)/g;
function harvest(html) {
  let m;
  while ((m = RE.exec(html || ''))) {
    const n = T(ent(m[2].trim()));
    if (!n) continue;
    (pairs[n] = pairs[n] || {});
    pairs[n][m[1]] = (pairs[n][m[1]] || 0) + 1;
  }
}

let done = 0;
for (const simp of Object.keys(ID)) {
  const rec = byName[toKuro(simp)] || byName[simp];
  if (!rec || !rec.content || !rec.content.linkId) continue;
  const d = await post('https://api.kurobbs.com/wiki/core/catalogue/item/getEntryDetail', { id: rec.content.linkId });
  if (d && d.data && d.data.content) {
    for (const mod of d.data.content.modules)
      for (const x of (mod.components || []))
        if (/突破材料|技能/.test(x.title || '')) {
          if (x.content) harvest(x.content);
          for (const tb of (x.tabs || [])) harvest(tb.content);
        }
  }
  done++;
  process.stdout.write(`\r掃描角色 ${done}/${Object.keys(ID).length}   `);
  await sleep(420);
}
console.log('\n收集到名稱↔圖檔配對', Object.keys(pairs).length, '組');

/* ---------- 下載仍缺的 ---------- */
const isImg = b => b.length > 400 && (
  b.slice(0, 8).toString('hex') === '89504e470d0a1a0a' ||
  b.slice(0, 3).toString('hex') === 'ffd8ff' ||
  b.slice(0, 4).toString() === 'RIFF');
const slugOf = n => 'm_' + crypto.createHash('md5').update(n).digest('hex').slice(0, 12) + '.png';

/* 已經在用的圖片內容，避免補進來的圖跟現有的撞在一起 */
const used = {};
for (const n of Object.keys(MATS)) {
  if (!MATS[n].ic) continue;
  const p = path.join(SITE, MATS[n].ic);
  if (fs.existsSync(p)) used[crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex')] = n;
}

const added = {}, noSrc = [];
let dl = 0, fail = 0;
for (const n of missing) {
  const cand = pairs[n];
  if (!cand) { noSrc.push(n); continue; }
  const url = Object.keys(cand).sort((a, b) => cand[b] - cand[a])[0];
  const rel = 'assets/img/item/' + slugOf(n);
  try {
    const r = await fetch(url, { headers: { 'user-agent': H['user-agent'], referer: 'https://wiki.kurobbs.com/' } });
    const b = Buffer.from(await r.arrayBuffer());
    if (!isImg(b)) { fail++; continue; }
    const h = crypto.createHash('md5').update(b).digest('hex');
    if (used[h]) { console.log(`  ⚠ ${n} 抓到的圖跟「${used[h]}」一模一樣，不放`); fail++; continue; }
    fs.writeFileSync(path.join(SITE, rel), b);
    used[h] = n; added[n] = rel; dl++;
  } catch (e) { fail++; }
  await sleep(120);
}

for (const [n, rel] of Object.entries(added)) MATS[n].ic = rel;

saveAsc(A);

const total = Object.keys(MATS).length, withIc = Object.keys(MATS).filter(n => MATS[n].ic).length;
console.log(`\n補上 ${dl}｜庫街區也沒有 ${noSrc.length}｜下載或撞圖而放棄 ${fail}`);
console.log(`有圖示的素材 ${withIc}/${total}`);
if (noSrc.length) console.log('仍然沒有圖示：' + noSrc.join('、'));
