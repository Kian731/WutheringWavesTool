/* 合併重複登錄的素材
 *
 * 同一個素材因為兩邊來源的引號寫法不同（BWIKI 用「」、庫街區用 “”）
 * 被當成兩種素材，養成計劃就會把同一樣東西算兩次。
 * 另外還有少數明顯的錯字（中級囈語聲核 → 中頻囈語聲核，全站只出現一次）。
 *
 * 用法： cd tools && node merge-dupe-mats.mjs
 */
import fs from 'fs';
import { loadAsc, saveAsc } from './asc-io.mjs';

const A = loadAsc();
const MATS = A.mats;

/* 引號正規化：“x” 與 「x」 視為同一個，一律留「」那個寫法 */
const norm = n => n.replace(/[“”"']/g, m => (m === '“' || m === '"' || m === "'" ? '「' : '」'));

const alias = {};                       // 舊名 -> 正式名
const groups = {};
for (const n of Object.keys(MATS)) (groups[norm(n)] = groups[norm(n)] || []).push(n);
for (const [canon, arr] of Object.entries(groups)) {
  if (arr.length < 2) continue;
  const keep = arr.includes(canon) ? canon : arr[0];
  arr.forEach(n => { if (n !== keep) alias[n] = keep; });
}

/* 明顯錯字：只出現一兩次、且有一個用量大得多的同系列正確名稱 */
const TYPOS = { '中級囈語聲核': '中頻囈語聲核' };
for (const [bad, good] of Object.entries(TYPOS)) if (MATS[bad] && MATS[good]) alias[bad] = good;

if (!Object.keys(alias).length) { console.log('沒有重複的素材'); process.exit(0); }
console.log('要合併的素材：');
for (const [a, b] of Object.entries(alias)) console.log(`  ${a} → ${b}`);

/* 改寫所有引用；同一份清單裡若兩個名字都出現就把數量加起來 */
let hits = 0;
function fixList(list) {
  if (!Array.isArray(list)) return list;
  const acc = [], idx = {};
  for (const m of list) {
    if (!m || typeof m.n !== 'string') { acc.push(m); continue; }
    const n = alias[m.n] || m.n;
    if (alias[m.n]) hits++;
    if (idx[n] !== undefined) acc[idx[n]].q += m.q;
    else { idx[n] = acc.length; acc.push({ n: n, q: m.q }); }
  }
  return acc;
}
for (const bag of [A.chars, A.weapons])
  for (const id of Object.keys(bag)) bag[id] = (bag[id] || []).map(fixList);
for (const sc of Object.values(A.skills)) {
  sc.lv = (sc.lv || []).map(fixList);
  (sc.branch || []).forEach(b => { b.mats = fixList(b.mats); });
}

/* 保留正式名稱那一筆的圖示；若它沒有圖而被合併掉的有，就接收過來 */
for (const [bad, good] of Object.entries(alias)) {
  if (!MATS[good].ic && MATS[bad] && MATS[bad].ic) MATS[good].ic = MATS[bad].ic;
  delete MATS[bad];
}

const r = saveAsc(A);
console.log(`\n改寫引用 ${hits} 處｜素材 ${Object.keys(alias).length + r.mats} → ${r.mats} 種`);
