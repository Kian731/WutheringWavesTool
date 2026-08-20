import fs from 'fs';
const API = 'https://wiki.biligame.com/wutheringwaves/api.php';
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; wuwa-guide-builder/1.0)' };

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function jget(params) {
  const u = API + '?' + new URLSearchParams({ format: 'json', ...params });
  for (let i = 0; i < 7; i++) {
    try {
      const r = await fetch(u, { headers: UA });
      const t = await r.text();
      if (t.startsWith('{')) return JSON.parse(t);
      // 回傳的是防爬蟲頁 → 等久一點再試
      process.stdout.write('~');
      await sleep(6000 * (i + 1));
      continue;
    } catch (e) { await sleep(3000 * (i + 1)); }
  }
  throw new Error('fetch failed: ' + u);
}

async function categoryMembers(name) {
  let out = [], cont;
  do {
    const p = { action: 'query', list: 'categorymembers', cmtitle: '分类:' + name, cmlimit: '500' };
    if (cont) p.cmcontinue = cont;
    const j = await jget(p);
    out.push(...j.query.categorymembers.map(m => m.title));
    cont = j.continue && j.continue.cmcontinue;
  } while (cont);
  return out.filter(t => !t.startsWith('模板:') && !t.startsWith('分类:'));
}

/* 一次抓 20 頁的 wikitext + 圖片清單 */
async function fetchPages(titles) {
  const res = {};
  for (let i = 0; i < titles.length; i += 20) {
    const batch = titles.slice(i, i + 20);
    const j = await jget({
      action: 'query', prop: 'revisions|images', imlimit: '500',
      rvprop: 'content', rvslots: 'main', titles: batch.join('|')
    });
    for (const p of Object.values(j.query.pages)) {
      if (!p.revisions) continue;
      res[p.title] = {
        text: p.revisions[0].slots.main['*'],
        images: (p.images || []).map(x => x.title)
      };
    }
    process.stdout.write('.');
    await sleep(500);
  }
  process.stdout.write('\n');
  return res;
}

/* ---- wikitext 模板解析（處理巢狀大括號） ---- */
function extractTemplate(text, name) {
  const start = text.indexOf('{{' + name);
  if (start < 0) return null;
  let depth = 0, i = start;
  for (; i < text.length; i++) {
    if (text.startsWith('{{', i)) { depth++; i++; }
    else if (text.startsWith('}}', i)) { depth--; i++; if (depth === 0) { i++; break; } }
  }
  const body = text.slice(start + 2 + name.length, i - 2);
  // 以 depth 0 的 | 切分參數
  const parts = [];
  let buf = '', d = 0;
  for (let k = 0; k < body.length; k++) {
    const c = body[k];
    if (body.startsWith('{{', k) || body.startsWith('[[', k)) { d++; buf += body.slice(k, k + 2); k++; continue; }
    if (body.startsWith('}}', k) || body.startsWith(']]', k)) { d--; buf += body.slice(k, k + 2); k++; continue; }
    if (c === '|' && d === 0) { parts.push(buf); buf = ''; continue; }
    buf += c;
  }
  parts.push(buf);
  const obj = {};
  for (const p of parts) {
    const eq = p.indexOf('=');
    if (eq < 0) continue;
    const k = p.slice(0, eq).trim();
    let v = p.slice(eq + 1);
    v = v.replace(/<!--[\s\S]*?-->/g, '').trim();
    if (k) obj[k] = v;
  }
  return obj;
}

async function main() {
  const out = { chars: {}, weapons: {}, echoes: {} };

  console.log('抓取分類清單…');
  const [cChar, cWep, cEcho] = await Promise.all([
    categoryMembers('共鸣者'), categoryMembers('武器'), categoryMembers('声骸')
  ]);
  console.log('共鸣者', cChar.length, '武器', cWep.length, '声骸', cEcho.length);

  console.log('抓取共鸣者頁面…');
  const pChar = await fetchPages(cChar);
  for (const [title, p] of Object.entries(pChar)) {
    const name = title.replace(/^共鸣者\//, '');
    if (name.includes('/')) continue;              // 語音等子頁
    const base = extractTemplate(p.text, '共鸣者/基本资料');
    if (!base) continue;
    out.chars[name] = {
      name,
      base,
      stats: extractTemplate(p.text, '共鸣者/基础属性'),
      skills: extractTemplate(p.text, '共鸣者/技能'),
      chains: extractTemplate(p.text, '共鸣者/共鸣链'),
      images: p.images
    };
  }
  console.log('共鸣者解析', Object.keys(out.chars).length);

  console.log('抓取武器頁面…');
  const pWep = await fetchPages(cWep);
  for (const [title, p] of Object.entries(pWep)) {
    const name = title.replace(/^武器\//, '');
    const t = extractTemplate(p.text, '武器');
    if (!t) continue;
    out.weapons[name] = { name, t, images: p.images.filter(x => x.includes('武器 ')) };
  }
  console.log('武器解析', Object.keys(out.weapons).length);

  console.log('抓取声骸頁面…');
  const pEcho = await fetchPages(cEcho);
  for (const [title, p] of Object.entries(pEcho)) {
    const name = title.replace(/^声骸\//, '');
    const t = extractTemplate(p.text, '声骸');
    if (!t) continue;
    out.echoes[name] = { name, t, images: p.images };
  }
  console.log('声骸解析', Object.keys(out.echoes).length);

  fs.writeFileSync('raw.json', JSON.stringify(out));
  console.log('已寫入 raw.json', (fs.statSync('raw.json').size / 1e6).toFixed(1), 'MB');
}
main();
