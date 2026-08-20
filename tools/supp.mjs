/* 補齊 biligame 上沒上傳的圖：改用 wuthering.gg 當備援圖源 */
import fs from 'fs';
import path from 'path';
const SITE = path.resolve('..');
const GG = 'https://wuthering.gg/';
const UA = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const load = f => { const g = {}; new Function('window', fs.readFileSync(SITE + '/' + f, 'utf8'))(g); return g; };
const chars = load('data/characters.js').WW_CHARACTERS;
const echoes = load('data/echoes.js').WW_ECHOES;
const bkEcho = load('data/backup/echoes.js').WW_ECHOES;

const supp = {};                       // out路徑 -> url
const slug = en => en.toLowerCase().replace(/[():,]/g, '').trim().replace(/\s+/g, '-');

const CORE_T = [/低頻|簡陋/, /中頻|基準/, /高頻|改造/, /全頻|特製/];

const need = chars.filter(c => !c.art || c.chains.some(x => !x.ic) || c.skills.some(x => !x.ic) || c.asc.some(a => !a.ic));
console.log('需補圖角色', need.length);

for (const c of need) {
  const url = GG + 'characters/' + slug(c.en);
  let h = '';
  for (let a = 0; a < 3; a++) {
    try { const r = await fetch(url, { headers: UA }); if (r.ok) { h = await r.text(); break; } } catch (e) { }
    await sleep(900 * (a + 1));
  }
  if (!h) { console.log('  取不到', c.name, url); continue; }
  const one = re => { const m = h.match(re); return m ? GG + m[0] : null; };

  if (!c.art) {
    const u = one(/images\/iconrolepile\/[A-Za-z0-9_.\-]+\.png/);
    if (u) supp[`assets/img/art/${c.id}.png`] = u;
  }
  if (c.chains.some(x => !x.ic)) {
    const m = h.match(/images\/icondevice\/T_IconDevice_([A-Za-z0-9]+)M1_UI\.png/);
    if (m) for (let i = 1; i <= 6; i++)
      supp[`assets/img/chain/${c.id}_${i}.png`] = GG + `images/icondevice/T_IconDevice_${m[1]}M${i}_UI.png`;
  }
  if (c.skills.some(x => !x.ic)) {
    const map = { B1: 'skill', C1: 'ult', Y: 'forte', QTE: 'intro', T: 'outro', D1: 'passive1', D2: 'passive2' };
    for (const [suf, key] of Object.entries(map)) {
      const m = h.match(new RegExp(`images/iconskill/SP_Icon[A-Za-z0-9]+${suf}\\.png`));
      if (m) supp[`assets/img/skill/${c.id}_${key}.png`] = GG + m[0];
    }
  }
  if (c.asc.some(a => !a.ic)) {
    const spec = one(/images\/items\/T_IconC_\d+_UI\.png/);
    const coreFF = h.match(/images\/items\/T_IconMout_[A-Z]_\d+_4_UI\.png/);
    const boss = [...h.matchAll(/images\/items\/T_IconMout_(?:[A-Z]_)?\d+_UI\.png/g)].map(m => m[0])[0];
    c.asc.forEach((a, i) => {
      if (a.ic) return;
      const tier = CORE_T.findIndex(re => re.test(a.n));
      if (tier >= 0 && coreFF) supp[a.icOut || `assets/img/item/x_${c.id}_${i}.png`] = GG + coreFF[0].replace('_4_UI', `_${tier + 1}_UI`);
      else if (/幣|贝币/.test(a.n)) supp[`assets/img/item/x_${c.id}_${i}.png`] = GG + 'images/items/T_IconA_hsb_UI.png';
      else if (a.q === '60' && spec) supp[`assets/img/item/x_${c.id}_${i}.png`] = spec;
      else if (a.q === '46' && boss) supp[`assets/img/item/x_${c.id}_${i}.png`] = GG + boss;
      a._supp = `assets/img/item/x_${c.id}_${i}.png`;
    });
  }
  process.stdout.write('.');
  await sleep(400);
}
console.log('');

/* 缺圖示的聲骸：用舊資料的英文名對到 wuthering.gg 的聲骸圖 */
const enIc = {}; bkEcho.forEach(e => { if (e.en) enIc[e.en] = e.ic; });
let eFix = 0;
echoes.forEach((e, i) => {
  if (e.ic || !e.en || !enIc[e.en]) return;
  supp[`assets/img/echo/${String(i + 1).padStart(3, '0')}_gg.png`] = GG + enIc[e.en];
  e._supp = `assets/img/echo/${String(i + 1).padStart(3, '0')}_gg.png`;
  eFix++;
});

/* 把 supp 對應寫回，供 build 使用 */
const patch = { images: supp, charItem: {}, echoIc: {} };
for (const c of chars) c.asc.forEach((a, i) => { if (a._supp && supp[a._supp]) patch.charItem[c.id + '|' + i] = a._supp; });
for (const e of echoes) if (e._supp && supp[e._supp]) patch.echoIc[e.cn] = e._supp;
fs.writeFileSync('supp.json', JSON.stringify(patch, null, 1));
console.log('補圖', Object.keys(supp).length, '（聲骸', eFix, '）');
