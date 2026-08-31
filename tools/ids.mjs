/* 角色代號對照（可自動長出新角色）
 * 以前各支工具各自寫死一份 ID 表，wiki 出新角色就會被略過。
 * 這裡改成：舊角色沿用既有代號，新角色用拼音自動產生並寫回 ids.json。
 */
import fs from 'fs';
import path from 'path';
import * as OpenCC from 'opencc-js';
import pinyin from 'tiny-pinyin';

const HERE = path.resolve('.');
const SITE = path.resolve('..');
const FILE = path.join(HERE, 'ids.json');

const toTW = OpenCC.Converter({ from: 'cn', to: 'tw' });
const toCN = OpenCC.Converter({ from: 'tw', to: 'cn' });

let map = {};          // 名稱（簡＋繁都放）-> id
let added = [];

function slug(name) {
  const py = pinyin.convertToPinyin(name, '', true).toLowerCase()
    .replace(/[·・．]/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-').replace(/^-|-$/g, '');
  return py || ('char-' + Buffer.from(name).toString('hex').slice(0, 8));
}

function seed() {
  /* 第一次執行：用站上現有資料當種子，確保代號與網址不會變動 */
  const g = {};
  try { new Function('window', fs.readFileSync(path.join(SITE, 'data/characters.js'), 'utf8'))(g); }
  catch (e) { return; }
  for (const c of (g.WW_CHARACTERS || [])) {
    map[c.name] = c.id;
    map[toCN(c.name)] = c.id;
  }
}

export function loadIds() {
  if (fs.existsSync(FILE)) map = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  else { seed(); save(); }
  return map;
}

/* 取得（必要時產生）某個角色名的站內代號 */
export function idFor(name) {
  if (!name) return null;
  if (map[name]) return map[name];
  const tw = toTW(name), cn = toCN(name);
  if (map[tw]) { map[name] = map[tw]; return map[tw]; }
  if (map[cn]) { map[name] = map[cn]; return map[cn]; }

  let id = slug(tw), n = 2;
  const used = new Set(Object.values(map));
  while (used.has(id)) id = slug(tw) + '-' + (n++);
  map[name] = id; map[tw] = id; map[cn] = id;
  added.push({ name: tw, id });
  return id;
}

export function newlyAdded() { return added.slice(); }
export function save() { fs.writeFileSync(FILE, JSON.stringify(map, null, 1)); }

/* 給舊程式沿用的介面：回傳「簡體名 -> id」的物件 */
export function idMapFor(names) {
  loadIds();
  const out = {};
  names.forEach(n => { out[n] = idFor(n); });
  save();
  return out;
}
