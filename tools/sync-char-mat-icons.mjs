/* 讓角色內頁的「突破素材」圖示跟素材登錄表一致
 *
 * 角色頁的素材圖示是各自抓下來的（x_suisui_0.png、014.png 這種編號檔名），
 * 跟養成計劃用的素材登錄表是兩套，而且編號檔名同樣有對錯人的問題。
 * 這支把角色頁統一改用登錄表裡已驗證的圖；
 * 登錄表判定「沒有可信圖示」的，角色頁也一併拿掉，不要亂放。
 *
 * 用法： cd tools && node sync-char-mat-icons.mjs
 */
import fs from 'fs';
import path from 'path';
import { loadAsc } from './asc-io.mjs';

const SITE = path.resolve('..');
const CH_PATH = path.join(SITE, 'data/characters.js');
const MATS = loadAsc().mats;

const g = {};
new Function('window', fs.readFileSync(CH_PATH, 'utf8'))(g);
const chars = g.WW_CHARACTERS;
if (!Array.isArray(chars) || !chars.length) throw new Error('characters.js 讀不出資料');

let synced = 0, cleared = 0, kept = 0, unknown = [];
for (const c of chars) {
  for (const a of (c.asc || [])) {
    /* 引號寫法不同（“x” / 「x」）在登錄表已經合併過，這裡也跟著正規化 */
    if (!MATS[a.n]) {
      const alt = a.n.replace(/[“”\"']/g, m2 => (m2 === '”' ? '」' : '「'));
      if (MATS[alt]) a.n = alt;
    }
    const m = MATS[a.n];
    if (!m) { unknown.push(c.name + '：' + a.n); continue; }
    if (m.ic) { if (a.ic !== m.ic) { a.ic = m.ic; synced++; } else kept++; }
    else if (a.ic) { delete a.ic; cleared++; }
  }
}

const head = fs.readFileSync(CH_PATH, 'utf8').split('window.WW_CHARACTERS')[0];
const out = head + 'window.WW_CHARACTERS = ' + JSON.stringify(chars) + ';\n';
/* 寫出去之前先確認還讀得回來、筆數沒掉 */
const v = {};
new Function('window', out)(v);
if (v.WW_CHARACTERS.length !== chars.length) throw new Error('序列化後角色數對不上');
fs.writeFileSync(CH_PATH, out);

console.log(`角色 ${chars.length} 位｜改用登錄表的圖 ${synced}｜本來就一致 ${kept}｜清掉沒有可信圖的 ${cleared}`);
if (unknown.length) console.log('素材表裡查不到（保持原狀）：' + unknown.join('、'));
