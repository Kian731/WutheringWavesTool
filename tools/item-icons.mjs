/* 素材圖示重建
 *
 * 為什麼要有這支：舊的做法把檔名編成 p_001、p_002…（跑一次遞增一次），
 * 但每次跑的素材集合會變（新素材、或該素材已從角色頁拿到圖而被跳過），
 * 所以同一個 p_025.png 在不同次執行代表不同素材；
 * 下載迴圈又有「檔案已存在就跳過」，於是舊圖被留下來配到新素材身上 —— 圖示就錯亂了。
 *
 * 這支的做法：
 *   1. 檔名改由「素材名稱的雜湊」決定（m_xxxxxxxx.png），跟執行順序完全無關。
 *   2. 只接受 BWIKI 上「檔名完全相同」的 `文件:道具 <簡體名>.png`，
 *      對不上的就不給圖示（寧可留白，也不亂放）。
 *   3. 下載後比對內容雜湊，若兩個素材拿到同一張圖就一起拿掉並回報。
 *
 * 用法： cd tools && node item-icons.mjs
 */
import fs from 'fs';
import { loadAsc, saveAsc } from './asc-io.mjs';
import path from 'path';
import crypto from 'crypto';
import OpenCC from 'opencc-js';

const SITE = path.resolve('..');
const IMGDIR = path.join(SITE, 'assets/img/item');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36';
const API = 'https://wiki.biligame.com/wutheringwaves/api.php';
const toCN = OpenCC.Converter({ from: 'tw', to: 'cn' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- 讀目前的素材清單 ---------- */
const A = loadAsc();
const MATS = A.mats;
const names = Object.keys(MATS);
console.log('素材共', names.length, '種');

/* 檔名只跟素材名稱有關，跟執行順序無關 —— 這是整支工具的重點 */
const slugOf = n => 'm_' + crypto.createHash('md5').update(n).digest('hex').slice(0, 12) + '.png';

/* ---------- 一、決定每個素材該用哪個 wiki 檔名 ---------- */
/* 只用「完全相同」的名字，不做模糊比對 */
function titlesFor(n) {
  const s = toCN(n);
  const out = [`道具 ${s}.png`];
  const noq = s.replace(/[「」“”"']/g, '');
  if (noq !== s) out.push(`道具 ${noq}.png`);
  return out;
}

/* filemap.json 是上次抓頁面時記下的「檔名 → CDN 網址」，先用它省 API 呼叫 */
let FILEMAP = {};
try { FILEMAP = JSON.parse(fs.readFileSync('filemap.json', 'utf8')); } catch { }

const want = new Map();          // 素材名 -> wiki 檔名
const need = new Set();          // 還要問 API 的 wiki 檔名
for (const n of names) {
  const t = titlesFor(n).find(x => FILEMAP[x]) || titlesFor(n)[0];
  want.set(n, t);
  if (!FILEMAP[t]) need.add(t);
}
console.log('filemap 已有網址', names.length - need.size, '｜需要向 API 查詢', need.size);

/* ---------- 二、向 BWIKI 查缺少的檔案網址（一次 50 個） ---------- */
const urls = Object.assign({}, FILEMAP);
const listNeed = [...need];
for (let i = 0; i < listNeed.length; i += 50) {
  const batch = listNeed.slice(i, i + 50);
  const q = API + '?action=query&format=json&prop=imageinfo&iiprop=url&titles=' +
    encodeURIComponent(batch.map(t => 'File:' + t).join('|'));
  let j;
  for (let a = 0; a < 4 && !j; a++) {
    try {
      const r = await fetch(q, { headers: { 'user-agent': UA, referer: 'https://wiki.biligame.com/wutheringwaves/' } });
      const txt = await r.text();
      if (txt.trim().startsWith('{')) j = JSON.parse(txt);
      else { console.log('  被擋下，等一下再試…'); await sleep(6000 * (a + 1)); }
    } catch (e) { await sleep(4000 * (a + 1)); }
  }
  if (!j) { console.log('  這批查不到，跳過'); continue; }
  const pages = (j.query && j.query.pages) || {};
  for (const p of Object.values(pages)) {
    if (p.missing !== undefined || !p.imageinfo) continue;
    urls[String(p.title).replace(/^文件:|^File:/, '')] = p.imageinfo[0].url;
  }
  process.stdout.write(`  查詢 ${Math.min(i + 50, listNeed.length)}/${listNeed.length}\r`);
  await sleep(400);
}
console.log('\n可取得網址的素材', names.filter(n => urls[want.get(n)]).length, '/', names.length);

/* ---------- 三、下載 ---------- */
const isImg = b => b.length > 400 && (
  b.slice(0, 8).toString('hex') === '89504e470d0a1a0a' ||
  b.slice(0, 3).toString('hex') === 'ffd8ff' ||
  b.slice(0, 4).toString() === 'RIFF');

fs.mkdirSync(IMGDIR, { recursive: true });
const got = {};                  // 素材名 -> 相對路徑
let dl = 0, skip = 0, fail = 0;
for (const n of names) {
  const url = urls[want.get(n)];
  if (!url) continue;
  const rel = 'assets/img/item/' + slugOf(n);
  const abs = path.join(SITE, slugOf(n) && rel);
  if (fs.existsSync(abs) && isImg(fs.readFileSync(abs))) { got[n] = rel; skip++; continue; }
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA, referer: 'https://wiki.biligame.com/wutheringwaves/' } });
    const b = Buffer.from(await r.arrayBuffer());
    if (isImg(b)) { fs.writeFileSync(abs, b); got[n] = rel; dl++; }
    else fail++;
  } catch (e) { fail++; }
  process.stdout.write(`  下載 ${dl + skip + fail}/${names.length}\r`);
  await sleep(120);
}
console.log(`\n下載 ${dl}｜沿用既有 ${skip}｜失敗 ${fail}`);

/* ---------- 四、內容重複檢查：同一張圖配到兩個素材就一起拿掉 ---------- */
const byHash = {};
for (const [n, rel] of Object.entries(got)) {
  const h = crypto.createHash('md5').update(fs.readFileSync(path.join(SITE, rel))).digest('hex');
  (byHash[h] = byHash[h] || []).push(n);
}
let dropped = 0;
for (const arr of Object.values(byHash)) {
  if (arr.length < 2) continue;
  console.log('  ⚠ 同一張圖對到多個素材，全部不放：' + arr.join('、'));
  arr.forEach(n => { delete got[n]; dropped++; });
}

/* ---------- 五、寫回 data/ascension.js ---------- */
/* 只處理自己能負責的部分：
   - 有 BWIKI 同名圖 → 用它
   - 沒有，但現有圖示是穩定命名（m_雜湊）→ 那是別的來源驗證過的，留著
   - 沒有，而現有圖示還是舊的編號檔名（p_001 之類）→ 那批對應關係不可信，清掉 */
const STABLE = /\/m_[0-9a-f]{12}\.png$/;
let changed = 0, cleared = 0, kept = 0;
for (const n of names) {
  const now = MATS[n].ic || null, next = got[n] || null;
  if (next) { if (now !== next) changed++; MATS[n].ic = next; }
  else if (now && STABLE.test(now)) kept++;
  else if (now) { delete MATS[n].ic; cleared++; }
}
console.log('沿用其他來源已驗證的圖示', kept, '個');
saveAsc(A);

const withIc = names.filter(n => MATS[n].ic).length;
console.log(`\n改用新圖 ${changed}｜清掉對不上的 ${cleared}（其中 ${dropped} 個是重複圖）`);
console.log(`最後有圖示的素材 ${withIc}/${names.length}，沒有圖示的會顯示名稱前兩字`);
const noIc = names.filter(n => !MATS[n].ic);
if (noIc.length) console.log('沒有圖示：' + noIc.join('、'));
