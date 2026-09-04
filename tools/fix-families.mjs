/* 補上「共同前綴」型的合成家族
 *
 * 原本只認得「共同後綴」的合成線（低頻／中頻／高頻／全頻 ＋ ○○聲核），
 * 所以 聲律種核→萌芽→新葉→花蕾、海蝕嵌合體210→226→235→239
 * 這種「前綴相同、後綴才是階層」的合成線被當成單獨素材。
 *
 * 判定方式跟原本的後綴規則一樣嚴格：
 *   3～4 個成員、彼此在遊戲裡第一次出現的突破階層互不相同，才算同一條合成線。
 *
 * 用法： cd tools && node fix-families.mjs
 */
import fs from 'fs';
import { loadAsc, saveAsc } from './asc-io.mjs';
import path from 'path';

const SITE = path.resolve('..');
const A = loadAsc();
const MATS = A.mats;

/* 每個素材第一次出現在第幾階，用來判斷合成線的高低順序 */
const firstTier = {};
for (const bag of [A.chars, A.weapons])
  for (const tiers of Object.values(bag || {}))
    (tiers || []).forEach((list, i) => (list || []).forEach(m => {
      if (firstTier[m.n] === undefined || i < firstTier[m.n]) firstTier[m.n] = i;
    }));

const before = Object.keys(MATS).filter(n => MATS[n].fam).length;
const solo = Object.keys(MATS).filter(n => !MATS[n].fam && firstTier[n] !== undefined);

/* 依共同前綴分組（前綴長度 2～5 字） */
const found = [];
for (let plen = 5; plen >= 2; plen--) {
  const groups = {};
  for (const n of solo) {
    if (MATS[n].fam) continue;            // 這一輪已經被較長的前綴收走了
    if (n.length <= plen) continue;
    (groups[n.slice(0, plen)] = groups[n.slice(0, plen)] || []).push(n);
  }
  for (const [key, arr] of Object.entries(groups)) {
    if (arr.length < 3 || arr.length > 4) continue;
    const tiers = new Set(arr.map(n => firstTier[n]));
    if (tiers.size !== arr.length) continue;      // 階層要能互相區分
    arr.sort((a, b) => firstTier[a] - firstTier[b]);
    arr.forEach((n, i) => { MATS[n].fam = key; MATS[n].tier = i; });
    found.push(key + '：' + arr.join(' → '));
  }
}

if (!found.length) console.log('沒有找到新的前綴型合成家族');
else { console.log('新增的合成家族：'); found.forEach(x => console.log('  ' + x)); }

saveAsc(A);

const after = Object.keys(MATS).filter(n => MATS[n].fam).length;
const famNames = [...new Set(Object.keys(MATS).filter(n => MATS[n].fam).map(n => MATS[n].fam))];
console.log(`\n有家族的素材 ${before} → ${after}｜合成家族數 ${famNames.length}`);
