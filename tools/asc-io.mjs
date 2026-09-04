/* data/ascension.js 的安全讀寫
 *
 * 不要再用「找 "mats": 然後做括號配對」那種字串手術：
 * "mats" 這個鍵在檔案裡出現 299 次（每個技能分支節點都有一個），
 * indexOf 會抓到第一個分支節點的 mats 陣列，改下去就把資料寫壞。
 *
 * 這裡的做法是把整個 WW_ASC 物件執行出來、改完再整包序列化回去。
 */
import fs from 'fs';
import path from 'path';

const SITE = path.resolve('..');
export const ASC_PATH = path.join(SITE, 'data/ascension.js');

export function loadAsc() {
  const g = {};
  new Function('window', fs.readFileSync(ASC_PATH, 'utf8'))(g);
  if (!g.WW_ASC || !g.WW_ASC.mats) throw new Error('ascension.js 讀不出 WW_ASC');
  return g.WW_ASC;
}

/* 寫回前先自我檢查，資料形狀不對就中止，不要留下半殘的檔案 */
export function saveAsc(A) {
  const need = ['levels', 'caps', 'chars', 'weapons', 'skills', 'mats'];
  for (const k of need) if (!A[k]) throw new Error('WW_ASC 缺少 ' + k + '，中止寫入');

  let branchBad = 0;
  for (const sc of Object.values(A.skills))
    for (const b of (sc.branch || []))
      if (!Array.isArray(b.mats) || !b.mats.every(m => m && typeof m.n === 'string')) branchBad++;
  if (branchBad) throw new Error('有 ' + branchBad + ' 個技能分支節點的素材格式壞掉，中止寫入');

  const head = fs.readFileSync(ASC_PATH, 'utf8').split('window.WW_ASC')[0];
  const out = head + 'window.WW_ASC = ' + JSON.stringify(A) + ';\n';

  /* 再讀一次確認寫出去的東西還能解析，且筆數沒有掉 */
  const g = {};
  new Function('window', out)(g);
  if (Object.keys(g.WW_ASC.mats).length !== Object.keys(A.mats).length) throw new Error('序列化後素材筆數對不上');

  fs.writeFileSync(ASC_PATH, out);
  return { mats: Object.keys(A.mats).length, chars: Object.keys(A.chars).length, weapons: Object.keys(A.weapons).length };
}
