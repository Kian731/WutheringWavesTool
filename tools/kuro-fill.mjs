/* 用庫街區官方 WIKI API 補齊 BWIKI 尚未填寫的技能／突破素材 */
import fs from 'fs';
import path from 'path';
import * as OpenCC from 'opencc-js';

const SITE = path.resolve('..');
const cc = OpenCC.Converter({ from: 'cn', to: 'tw' });
const FIX = [['維裡奈', '維里奈'], ['相裡要', '相里要']];
const T = s => { let t = cc(String(s == null ? '' : s)); for (const [a, b] of FIX) t = t.split(a).join(b); return t; };

const H = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126',
  'content-type': 'application/x-www-form-urlencoded', 'wiki_type': '9', 'source': 'h5'
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const post = async (url, body) => {
  for (let a = 0; a < 4; a++) {
    try { const r = await fetch(url, { method: 'POST', headers: H, body: new URLSearchParams(body) }); if (r.ok) return await r.json(); }
    catch (e) { }
    await sleep(900 * (a + 1));
  }
  return null;
};

/* HTML → 站內用的簡單 HTML */
function html2txt(s) {
  return T(String(s || '')
    .replace(/<img[^>]*>/g, '')
    .replace(/<\/p>\s*<p[^>]*>/g, '<br>')
    .replace(/<br\s*\/?>/gi, '<br>')
    .replace(/<strong[^>]*>|<\/strong>/g, m => m[1] === '/' ? '</b>' : '<b>')
    .replace(/<span[^>]*>/g, '<em>').replace(/<\/span>/g, '</em>')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n))
    .replace(/&(nbsp|middot|ldquo|rdquo|lsquo|rsquo|le|ge|times|hellip|mdash|ndash|amp|lt|gt|quot);/g,
      (m, k) => ({ nbsp: ' ', middot: '·', ldquo: '「', rdquo: '」', lsquo: '『', rsquo: '』', le: '≤', ge: '≥', times: '×', hellip: '…', mdash: '—', ndash: '–', amp: '&', lt: '<', gt: '>', quot: '"' }[k]))
    .replace(/(<br>\s*){3,}/g, '<br><br>')
    .replace(/^(<br>)+|(<br>)+$/g, '')
    .trim());
}
const ent = s => String(s||'').replace(/&nbsp;/g,' ').replace(/&middot;/g,'·').replace(/&ldquo;/g,'「').replace(/&rdquo;/g,'」').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');
function firstImg(s) { const m = String(s || '').match(/<img[^>]+src="([^"]+)"/); return m ? m[1] : null; }
function firstName(s) {
  const p = String(s || '').split(/<\/p>/)[0];
  const t = p.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&middot;/g, '·').trim();
  return T(t.split(/\s+/)[0] || '');
}

const KURO2ID = {
  '千咲': 'chisa', '仇远': 'qiuyuan', '爱弥斯': 'aemeath', '莫宁': 'mornye', '琳奈': 'lynae',
  '卜灵': 'buling', '夏空': 'ciaccona', '赞妮': 'zani', '长离': 'changli', '漂泊者-女-气动': 'rover-aero'
};
const SKILL_LABEL = {
  '常态攻击': '常態攻擊', '共鸣技能': '共鳴技能', '共鸣回路': '共鳴迴路', '共鸣解放': '共鳴解放',
  '变奏技能': '變奏技能', '延奏技能': '延奏技能', '固有技能': '固有技能', '谐度破坏': '諧度破壞'
};
const SLUG = {
  '常態攻擊': 'basic', '共鳴技能': 'skill', '共鳴迴路': 'forte', '共鳴解放': 'ult',
  '變奏技能': 'intro', '延奏技能': 'outro', '固有技能': 'passive1', '諧度破壞': 'tunebreak'
};

const load = f => { const g = {}; new Function('window', fs.readFileSync(path.join(SITE, f), 'utf8'))(g); return g; };
const chars = load('data/characters.js').WW_CHARACTERS;

console.log('取得庫街區共鳴者清單…');
const listJ = await post('https://api.kurobbs.com/wiki/core/catalogue/item/getPage', { catalogueId: '1105', page: '1', limit: '200' });
const recs = listJ.data.results.records;

const downloads = [];   // {url,out}
let fixedSkill = 0, fixedAsc = 0;

for (const [kname, id] of Object.entries(KURO2ID)) {
  const c = chars.find(x => x.id === id);
  if (!c) continue;
  const needSkill = c.skills.length < 6, needAsc = c.asc.length === 0;
  if (!needSkill && !needAsc) continue;

  const rec = recs.find(r => r.name === kname);
  if (!rec || !rec.content || !rec.content.linkId) { console.log('  找不到', kname); continue; }
  const d = await post('https://api.kurobbs.com/wiki/core/catalogue/item/getEntryDetail', { id: rec.content.linkId });
  if (!d || !d.data) { console.log('  取不到詳情', kname); continue; }
  const comp = t => { for (const m of d.data.content.modules) for (const x of (m.components || [])) if (x.title === t) return x; };

  if (needSkill) {
    const sk = comp('技能介绍');
    if (sk && sk.tabs) {
      c.skills = sk.tabs.map(tb => {
        const label = SKILL_LABEL[tb.title] || T(tb.title);
        const slug = SLUG[label] || 'x';
        const u = firstImg(tb.content);
        let ic = null;
        if (u) { ic = `assets/img/skill/${id}_${slug}.png`; downloads.push({ url: u, out: ic }); }
        else if (label === '常態攻擊') ic = c.wpIc;
        return { k: label, name: firstName(tb.content), desc: html2txt(tb.content), ic };
      });
      fixedSkill++;
    }
  }
  if (needAsc) {
    const ac = comp('角色突破材料');
    if (ac && ac.tabs) {
      const agg = {};
      for (const tb of ac.tabs) {
        const re = /<img[^>]+src="([^"]+)"[^>]*>(?:\s*<\/a>)?\s*<a[^>]*>([^<]+)<\/a>\s*x\s*([\d,]+)/g;
        let m;
        while ((m = re.exec(tb.content))) {
          const name = T(ent(m[2]).trim()), qty = parseInt(m[3].replace(/,/g, ''), 10) || 0;
          if (!agg[name]) agg[name] = { n: name, q: 0, url: m[1] };
          agg[name].q += qty;
        }
      }
      const arr = Object.values(agg).filter(a => !/貝幣|贝币/.test(a.n));
      if (arr.length) {
        c.asc = arr.map((a, i) => {
          const out = `assets/img/item/k_${id}_${i}.png`;
          downloads.push({ url: a.url, out });
          return { n: a.n, q: String(a.q), ic: out };
        });
        fixedAsc++;
      }
    }
  }
  console.log('  ✓', kname, needSkill ? '技能' : '', needAsc ? '素材' : '');
  await sleep(600);
}

/* 下載新圖 */
const valid = b => b.length > 400 && (b.slice(0, 8).toString('hex') === '89504e470d0a1a0a' || b.slice(0, 3).toString('hex') === 'ffd8ff' || b.slice(0, 4).toString() === 'RIFF');
let dl = 0;
for (const it of downloads) {
  const out = path.join(SITE, it.out);
  if (fs.existsSync(out) && valid(fs.readFileSync(out))) continue;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  try {
    const r = await fetch(it.url, { headers: { 'user-agent': H['user-agent'] } });
    const b = Buffer.from(await r.arrayBuffer());
    if (valid(b)) { fs.writeFileSync(out, b); dl++; }
  } catch (e) { }
  await sleep(120);
}

const hdr = fs.readFileSync(path.join(SITE, 'data/characters.js'), 'utf8').split('window.WW_CHARACTERS')[0];
fs.writeFileSync(path.join(SITE, 'data/characters.js'), hdr + 'window.WW_CHARACTERS = ' + JSON.stringify(chars) + ';\n');
console.log(`補技能 ${fixedSkill} 位、補突破素材 ${fixedAsc} 位，下載圖片 ${dl} 張`);
