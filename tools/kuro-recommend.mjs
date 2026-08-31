/* 用庫街區官方 WIKI 的「角色養成推薦」覆蓋站內的配裝推薦
 * 重點：官方有「聲骸首位推薦」欄位，也就是要放在聲骸第 1 格、要用它技能的主聲骸；
 * 先前站內是照 COST 由大到小推斷，會把 COST4 誤當主聲骸（例：穗穗其實是 COST3 的封庭械囿）。
 * 取得欄位：毀業配裝、聲骸首位推薦、主詞條、副詞條、武器推薦序列與武器首位推薦。
 */
import fs from 'fs';
import { idMapFor, newlyAdded } from './ids.mjs';
import path from 'path';
import * as OpenCC from 'opencc-js';

const SITE = path.resolve('..');
const cc = OpenCC.Converter({ from: 'cn', to: 'tw' });
const FIX = [['維裡奈', '維里奈'], ['相裡要', '相里要']];
const T = s => { let t = cc(String(s == null ? '' : s)); for (const [a, b] of FIX) t = t.split(a).join(b); return t; };
const ent = s => String(s || '').replace(/&nbsp;/g, ' ').replace(/&middot;/g, '·')
  .replace(/&ldquo;/g, '「').replace(/&rdquo;/g, '」').replace(/&amp;/g, '&')
  .replace(/&gt;/g, '＞').replace(/&lt;/g, '＜').replace(/&quot;/g, '"').replace(/%%+/g, '%');

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

/* ID 表改由 ids.mjs 依 wiki 現有角色自動產生（新角色會自動取得代號） */
const raw = JSON.parse(fs.readFileSync('raw.json', 'utf8'));
const ID = idMapFor(Object.keys(raw.chars).filter(n => !/預設|预设|:/.test(n)));
const toKuro = n => n.replace(/^漂泊者·(.+)$/, '漂泊者-女-$1');

const load = f => { const g = {}; new Function('window', fs.readFileSync(path.join(SITE, f), 'utf8'))(g); return g; };
const chars = load('data/characters.js').WW_CHARACTERS;
/* 每次執行都先還原成人工整理的原始值，確保可重複執行且不留上次的殘值 */
{
  const bk = load('data/backup/characters.js').WW_CHARACTERS;
  chars.forEach(c => {
    const b = bk.find(x => x.id === c.id);
    if (!b) return;
    c.build = Object.assign({}, b.build);
    c.sub = (b.sub || []).slice();
    delete c.subText;
  });
}
const echoes = load('data/echoes.js').WW_ECHOES;
const weapons = load('data/weapons.js').WW_WEAPONS;
const sonatas = load('data/sonatas.js').WW_SONATAS;
const echoNames = echoes.map(e => e.cn);
const wepNames = weapons.map(x => x.n);
const setNames = sonatas.map(s => s.cn);

const txt = h => ent(String(h || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const rowsOf = h => String(h || '').split(/<tr[^>]*>/).slice(1).map(r => r.split('</tr>')[0]);
const cellsOf = r => String(r || '').split(/<td[^>]*>/).slice(1).map(c => c.split('</td>')[0]);
const linksOf = h => [...String(h || '').matchAll(/<a[^>]*>([^<]+)<\/a>/g)].map(m => T(ent(m[1]).trim()));
/* 在一段文字裡找出已知名稱（長的優先，避免「無常凶鷺」被「夢魘·無常凶鷺」蓋掉） */
function findNames(text, pool) {
  const t = T(text), out = [];
  pool.slice().sort((a, b) => b.length - a.length).forEach(n => {
    if (t.indexOf(n) < 0) return;
    if (out.some(o => o.indexOf(n) >= 0)) return;
    out.push(n);
  });
  return out;
}

console.log('取得庫街區共鳴者清單…');
const listJ = await post('https://api.kurobbs.com/wiki/core/catalogue/item/getPage', { catalogueId: '1105', page: '1', limit: '200' });
const recs = listJ.data.results.records;

let hit = 0, none = [], changed = [];
for (const [cn, id] of Object.entries(ID)) {
  const c = chars.find(x => x.id === id);
  if (!c) continue;
  const rec = recs.find(r => r.name === toKuro(cn));
  if (!rec || !rec.content || !rec.content.linkId) { none.push(c.name); continue; }
  const d = await post('https://api.kurobbs.com/wiki/core/catalogue/item/getEntryDetail', { id: rec.content.linkId });
  let comp = null;
  if (d && d.data) for (const m of d.data.content.modules) for (const x of (m.components || []))
    if (/推荐/.test(x.title || '') && (x.tabs || []).some(t => /声骸推荐|武器推荐/.test(t.title))) comp = x;
  if (!comp) { none.push(c.name); await sleep(380); continue; }

  const before = JSON.stringify({ e: c.build.echo, s: c.build.set, m: c.build.main, w: c.build.weapon, sub: c.sub });
  const got = {};

  for (const tb of comp.tabs) {
    const rs = rowsOf(tb.content);
    if (/声骸推荐/.test(tb.title)) {
      for (const r of rs) {
        const cs = cellsOf(r);
        const head = txt(cs[0] || ''), rest = cs.slice(1).join(' ');
        if (/首位推荐/.test(head)) {
          const ns = linksOf(rest).filter(n => echoNames.includes(n));
          const found = ns.length ? ns : findNames(txt(rest), echoNames);
          if (found.length) {
            /* 長離這類有兩套配裝，欄位標題會帶套裝名 */
            const tag = findNames(head, setNames)[0];
            (got.echo = got.echo || []).push((tag ? tag + '：' : '') + [...new Set(found)].join(' 或 '));
          }
        } else if (/配装推荐/.test(head)) {
          const all = txt(rest);
          const grad = all.indexOf('毕业配装') >= 0 ? all.slice(all.indexOf('毕业配装')) : all;
          const pairs = [...T(grad).matchAll(/([一-鿿·]{3,10})\s*(\d)/g)]
            .filter(m => setNames.includes(m[1]));
          const best = {};
          pairs.forEach(m => { best[m[1]] = Math.max(best[m[1]] || 0, +m[2]); });
          const parts = Object.entries(best).map(([k, v]) => k + ' ' + v + ' 件');
          if (parts.length) got.set = parts.join('／');
          const cost = T(grad).match(/COST\s*([\d]+)/i);
          if (cost) got.cost = cost[1];
        } else if (/^主词条/.test(head)) {
          got.main = cs.slice(1).map(x => T(txt(x))).filter(Boolean).join('；');
        } else if (/^副词条/.test(head)) {
          got.sub = T(txt(rest)).replace(/^副詞條[：:]\s*/, '');
        }
      }
    }
    if (/武器推荐/.test(tb.title)) {
      for (const r of rs) {
        const cs = cellsOf(r);
        const head = txt(cs[0] || ''), rest = cs.slice(1).join(' ');
        if (/首位推荐/.test(head)) {
          const f = findNames(txt(rest), wepNames);
          if (f.length) got.wepTop = f[0];
        } else if (/^武器推荐/.test(head)) {
          const line = T(txt(rest)).split(/[。\n]/)[0];
          const seq = line.split(/[＞>]/).map(s => s.trim()).filter(s => wepNames.includes(s));
          if (seq.length) got.wepSeq = seq;
        }
      }
    }
  }

  if (got.echo || got.set || got.wepTop) {
    if (got.echo) c.build.echo = got.echo.join('　|　');
    if (got.set) c.build.set = (got.cost ? 'COST ' + got.cost + '：' : '') + got.set;
    if (got.main) c.build.main = got.main;
    if (got.wepSeq && got.wepSeq.length) c.build.weapon = got.wepSeq.join(' ＞ ');
    else if (got.wepTop) c.build.weapon = got.wepTop;
    if (got.sub) c.subText = got.sub;
    c.build.src = '庫街區官方推薦';
    hit++;
    if (JSON.stringify({ e: c.build.echo, s: c.build.set, m: c.build.main, w: c.build.weapon, sub: c.sub }) !== before)
      changed.push(c.name + '：主聲骸 ' + c.build.echo);
  } else none.push(c.name);
  process.stdout.write(`\r處理 ${hit + none.length}/${Object.keys(ID).length}   `);
  await sleep(380);
}

/* ============================================================
 * 第二輪：新角色的推薦放在另一頁「角色攻略專題頁」
 * 那裡的聲骸套裝分頁會寫「使用聲骸技能，召喚 X …在首位裝配該聲骸技能時」，
 * 也就是要放在第 1 格的主聲骸；另有「COST分配 毀業：34311」可佐證主聲骸的 COST。
 * ============================================================ */
console.log('\n第二輪：改抓角色攻略專題頁…');
let hit2 = 0; const still = [];
for (const [cn, id] of Object.entries(ID)) {
  const c = chars.find(x => x.id === id);
  if (!c || c.build.src === '庫街區官方推薦') continue;
  const rec = recs.find(r => r.name === toKuro(cn));
  if (!rec || !rec.content || !rec.content.linkId) { still.push(c.name); continue; }
  const d = await post('https://api.kurobbs.com/wiki/core/catalogue/item/getEntryDetail', { id: rec.content.linkId });
  let link = null;
  if (d && d.data) for (const m of d.data.content.modules) for (const x of (m.components || []))
    if (x.type === 'text-component' && /角色攻略/.test(x.content || '')) {
      const u = String(x.content).match(/wiki\.kurobbs\.com\/mc\/item\/(\d+)/);
      if (u) link = u[1];
    }
  if (!link) { still.push(c.name); await sleep(320); continue; }

  const g = await post('https://api.kurobbs.com/wiki/core/catalogue/item/getEntryDetail', { id: link });
  if (!g || !g.data) { still.push(c.name); await sleep(320); continue; }

  let setComp = null, wepComp = null;
  for (const m of g.data.content.modules) for (const x of (m.components || [])) {
    if (/声骸/.test(m.title + x.title)) setComp = x;
    if (/武器/.test(m.title + x.title)) wepComp = x;
  }
  const got = {};
  if (setComp && setComp.tabs) {
    for (const tb of setComp.tabs) {
      const t = T(txt(tb.content));
      /* 主聲骸：找「首位」前面最近的一個已知聲骸名 */
      const at = t.indexOf('首位');
      if (at > 0 && !got.echo) {
        const head = t.slice(0, at);
        /* 這個分頁講的是哪一套？先認出來，主聲骸一定屬於這一套 */
        const tabSet = findNames(tb.title, setNames)[0] || findNames(t.slice(0, 60), setNames)[0];
        /* 候選：文中出現、長度 ≥2、且確實屬於這一套的聲骸（避免「角」誤中「角色」） */
        let cands = echoNames.filter(n => n.length >= 2 && head.indexOf(n) >= 0);
        if (tabSet) {
          const inSet = cands.filter(n => (echoes.find(e => e.cn === n) || { s: [] }).s.includes(tabSet));
          if (inSet.length) cands = inSet;
        }
        /* 官方寫法是「召喚 X，…在首位裝配該聲骸技能時」，取最靠近「首位」的那個 */
        let best = null;
        cands.forEach(n => {
          const i = head.lastIndexOf(n);
          if (i < 0) return;
          const end = i + n.length;                 // 用結束位置比較，重疊時長名獲勝
          if (!best || end > best.end || (end === best.end && n.length > best.n.length)) best = { n: n, end: end };
        });
        if (best) { got.echo = [best.n]; if (tabSet) got.set = got.set || tabSet; }
      }
      /* COST 分配與主／副詞條 */
      const cost = t.match(/毀?業?[：:]?\s*(\d{5})/) || t.match(/COST\s*分配[^0-9]{0,8}(\d{5})/);
      if (cost && !got.cost) got.cost = cost[1];
      const mm = t.match(/COST4[：:](.*?)(?=聲骸詞條|副詞條|$)/);
      if (mm && !got.main) got.main = T(txt(mm[0])).replace(/\s+/g, ' ').trim();
      const ss = t.match(/(?:聲骸詞條|副詞條)[：:]?\s*(.+)$/);
      if (ss && !got.sub) got.sub = ss[1].trim();
      const st = findNames(tb.title, setNames)[0] || findNames(t.slice(0, 40), setNames)[0];
      if (st && !got.set) got.set = st;
    }
  }
  if (wepComp && wepComp.tabs) {
    const fuzzy = tok => wepNames.find(n => n === tok)
      || wepNames.find(n => tok.length >= 3 && n.slice(0, 3) === tok.slice(0, 3));
    for (const tb of wepComp.tabs) {
      const t = T(txt(tb.content));
      const at = t.indexOf('武器推薦');
      const line = (at >= 0 ? t.slice(at + 4) : t).split(/無特別說明|無特別說明|谐振|諧振/)[0];
      const seq = line.split(/[＞>》]/).map(x => x.trim()).map(fuzzy).filter(Boolean);
      if (seq.length) { got.wepSeq = [...new Set(seq)].slice(0, 5); break; }
    }
  }

  if (got.echo) {
    c.build.echo = got.echo.join(' 或 ') + (got.cost ? '（COST 配置 ' + got.cost + '，首位為 COST ' + got.cost[0] + '）' : '');
    if (got.set) c.build.set = got.set + (got.cost ? '　COST ' + got.cost : '');
    if (got.main) c.build.main = got.main;
    if (got.wepSeq) c.build.weapon = got.wepSeq.join(' ＞ ');
    if (got.sub) c.subText = got.sub;
    c.build.src = '庫街區角色攻略頁';
    hit2++;
    changed.push(c.name + '：主聲骸 ' + c.build.echo);
  } else still.push(c.name);
  process.stdout.write(`\r第二輪 ${hit2 + still.length}   `);
  await sleep(360);
}
console.log('\n第二輪補上 ' + hit2 + ' 位｜仍無官方資料 ' + still.length + ' 位：' + (still.join('、') || '無'));

/* 沒有官方推薦的角色標記成站方整理 */
chars.forEach(c => { if (!c.build.src) c.build.src = '站方整理'; });

const hdr = fs.readFileSync(path.join(SITE, 'data/characters.js'), 'utf8').split('window.WW_CHARACTERS')[0];
fs.writeFileSync(path.join(SITE, 'data/characters.js'), hdr + 'window.WW_CHARACTERS = ' + JSON.stringify(chars) + ';\n');

console.log('\n官方推薦套用 ' + hit + ' 位｜沿用站方整理 ' + none.length + ' 位');
if (none.length) console.log('  無官方推薦：' + none.join('、'));
console.log('\n主聲骸一覽：');
chars.slice().sort((a, b) => a.build.src.localeCompare(b.build.src)).forEach(c =>
  console.log('  ' + (c.build.src === '庫街區官方推薦' ? '官' : '站') + ' ' + c.name.padEnd(7) + ' ' + (c.build.echo || '—')));
