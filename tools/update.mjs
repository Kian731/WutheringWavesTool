/* 一鍵更新：照正確順序把整條資料管線跑完
 * 用法： cd tools && node update.mjs
 * 已存在的圖片會自動略過，所以第二次之後跑很快。
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const SITE = path.resolve('..');
const STEPS = [
  ['scrape.mjs', '抓 BWIKI 原始資料（角色／武器／聲骸）'],
  ['pageimgs2.mjs', '解析每頁圖片檔名與 CDN 網址'],
  ['build.mjs', '轉繁體並產生 data/*.js'],
  ['fetch-images.mjs', '下載缺少的圖片'],
  ['supp.mjs', '用 wuthering.gg 補 BWIKI 沒有的圖'],
  ['fetch-images.mjs', '下載補圖'],
  ['kuro-fill.mjs', '用庫街區官方 API 補技能／突破素材'],
  ['classify.mjs', '產生篩選用的分類標籤'],
  ['plan-data.mjs', '產生養成計劃用的分階突破素材']
];

function run(file) {
  return new Promise((res, rej) => {
    const p = spawn(process.execPath, [file], { stdio: 'inherit' });
    p.on('exit', c => c === 0 ? res() : rej(new Error(file + ' 結束碼 ' + c)));
    p.on('error', rej);
  });
}

/* 更新前先備份現有資料，出事可以還原 */
const stamp = fs.readFileSync(path.join(SITE, 'data/characters.js'), 'utf8')
  .match(/產生日期：([\d-]+)/);
const bak = path.join(SITE, 'data/_prev');
fs.mkdirSync(bak, { recursive: true });
for (const f of ['characters.js', 'weapons.js', 'echoes.js', 'sonatas.js'])
  fs.copyFileSync(path.join(SITE, 'data', f), path.join(bak, f));
console.log('已備份目前資料到 data/_prev（上次產生日期：' + (stamp ? stamp[1] : '未知') + '）\n');

const t0 = Date.now();
for (let i = 0; i < STEPS.length; i++) {
  const [file, desc] = STEPS[i];
  console.log(`\n──────── ${i + 1}/${STEPS.length}　${desc}　(${file}) ────────`);
  try { await run(file); }
  catch (e) {
    console.error('\n✗ 這一步失敗：' + e.message);
    console.error('  已產生的檔案保留原狀，可單獨重跑這一支再繼續。');
    process.exit(1);
  }
}

/* 收尾檢查 */
const load = f => { const g = {}; new Function('window', fs.readFileSync(path.join(SITE, f), 'utf8'))(g); return g; };
const cs = load('data/characters.js').WW_CHARACTERS;
const ws = load('data/weapons.js').WW_WEAPONS;
const es = load('data/echoes.js').WW_ECHOES;
const ss = load('data/sonatas.js').WW_SONATAS;
const old = { c: load('data/_prev/characters.js').WW_CHARACTERS, w: load('data/_prev/weapons.js').WW_WEAPONS, e: load('data/_prev/echoes.js').WW_ECHOES };

let missing = 0;
JSON.stringify({ cs, ws, es, ss }).replace(/"(assets\/img\/[^"]+)"/g, (m, p) => {
  if (!fs.existsSync(path.join(SITE, p))) { missing++; console.log('  缺圖:', p); } return m;
});

const newChars = cs.filter(c => !old.c.some(o => o.id === c.id)).map(c => c.name);
const newWeps = ws.filter(x => !old.w.some(o => o.n === x.n)).map(x => x.n);
const newEchoes = es.filter(x => !old.e.some(o => o.cn === x.cn)).map(x => x.cn);

console.log('\n════════ 更新完成（耗時 ' + Math.round((Date.now() - t0) / 1000) + ' 秒）════════');
console.log(`角色 ${cs.length}（前次 ${old.c.length}）｜武器 ${ws.length}（${old.w.length}）｜聲骸 ${es.length}（${old.e.length}）｜套裝 ${ss.length}`);
if (newChars.length) console.log('新增角色：' + newChars.join('、'));
if (newWeps.length) console.log('新增武器：' + newWeps.join('、'));
if (newEchoes.length) console.log('新增聲骸：' + newEchoes.join('、'));
if (!newChars.length && !newWeps.length && !newEchoes.length) console.log('沒有新內容（wiki 尚未更新）。');
console.log('技能齊全 ' + cs.filter(c => c.skills.length >= 6).length + '／' + cs.length +
  '｜共鳴鏈 6 條 ' + cs.filter(c => c.chains.length === 6).length + '／' + cs.length +
  '｜立繪 ' + cs.filter(c => c.art).length + '／' + cs.length +
  '｜突破素材 ' + cs.filter(c => c.asc.length >= 4).length + '／' + cs.length);
console.log(missing ? '⚠ 有 ' + missing + ' 張圖片檔案不存在' : '所有圖片引用都對得到檔案 ✓');
console.log('若結果有問題，把 data/_prev/ 裡的四個檔案複製回 data/ 即可還原。');
