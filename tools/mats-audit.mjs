/* 素材登錄表體檢
 *   1. 有被角色／武器／技能引用、卻沒登錄在 mats 裡的素材 → 補登錄
 *   2. 登錄了但沒有人用的 → 只回報，不動它（可能是還沒上線的內容）
 *   3. 圖示檔案不存在、或同一張圖被多個素材共用 → 一律清掉，寧可留白
 *
 * 用法： cd tools && node mats-audit.mjs
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { loadAsc, saveAsc } from './asc-io.mjs';

const SITE = path.resolve('..');
const A = loadAsc();
const MATS = A.mats;

/* 掃出所有被引用的素材 */
const used = {};
const chk = list => (list || []).forEach(m => { if (m && m.n) used[m.n] = (used[m.n] || 0) + 1; });
for (const bag of [A.chars, A.weapons]) for (const tiers of Object.values(bag)) (tiers || []).forEach(chk);
for (const sc of Object.values(A.skills)) { (sc.lv || []).forEach(chk); (sc.branch || []).forEach(b => chk(b.mats)); }

const orphans = Object.keys(used).filter(n => !MATS[n]);
orphans.forEach(n => { MATS[n] = {}; });
if (orphans.length) console.log('補登錄被引用但沒登錄的素材：' + orphans.join('、'));

const unused = Object.keys(MATS).filter(n => !used[n]);
if (unused.length) console.log('登錄了但目前沒有角色／武器用到（保留）：' + unused.join('、'));

/* 圖示健檢 */
const byHash = {};
let gone = 0;
for (const n of Object.keys(MATS)) {
  const rel = MATS[n].ic;
  if (!rel) continue;
  const abs = path.join(SITE, rel);
  if (!fs.existsSync(abs)) { delete MATS[n].ic; gone++; continue; }
  const h = crypto.createHash('md5').update(fs.readFileSync(abs)).digest('hex');
  (byHash[h] = byHash[h] || []).push(n);
}
let clash = 0;
for (const arr of Object.values(byHash)) {
  if (arr.length < 2) continue;
  console.log('  ⚠ 同一張圖對到多個素材，全部清掉：' + arr.join('、'));
  arr.forEach(n => { delete MATS[n].ic; clash++; });
}

const r = saveAsc(A);
const withIc = Object.keys(MATS).filter(n => MATS[n].ic).length;
console.log(`\n素材 ${r.mats} 種｜有圖示 ${withIc}｜檔案不見而清掉 ${gone}｜撞圖而清掉 ${clash}`);
const noIc = Object.keys(MATS).filter(n => !MATS[n].ic);
if (noIc.length) console.log('沒有圖示（' + noIc.length + '）：' + noIc.join('、'));
