import fs from 'fs';
const API='https://wiki.biligame.com/wutheringwaves/api.php';
const UA={'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126','referer':'https://wiki.biligame.com/wutheringwaves/'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function jget(p){for(let a=0;a<6;a++){try{const r=await fetch(API+'?'+p,{headers:UA});const t=await r.text();if(t.startsWith('{'))return JSON.parse(t);await sleep(5000*(a+1));}catch(e){await sleep(2500*(a+1));}}return null;}
const raw=JSON.parse(fs.readFileSync('raw.json','utf8'));
const pages=[...Object.keys(raw.chars).map(n=>'共鸣者/'+n),...Object.keys(raw.echoes).map(n=>'声骸/'+n),...Object.keys(raw.weapons).map(n=>'武器/'+n)];
const titles=fs.existsSync('pagetitles.json')?JSON.parse(fs.readFileSync('pagetitles.json','utf8')):{};
let n=0;
for(const t of pages){
  n++;
  if(titles[t])continue;
  const j=await jget(new URLSearchParams({action:'query',prop:'images',imlimit:'500',titles:t,format:'json'}).toString());
  const p=j&&j.query&&Object.values(j.query.pages)[0];
  titles[t]=(p&&p.images?p.images:[]).map(x=>x.title.replace(/^文件:/,''));
  if(n%20===0){fs.writeFileSync('pagetitles.json',JSON.stringify(titles));process.stdout.write(`\r${n}/${pages.length}   `);}
  await sleep(600);
}
fs.writeFileSync('pagetitles.json',JSON.stringify(titles));
// 收集所有未知檔名
const filemap=JSON.parse(fs.readFileSync('filemap.json','utf8'));
const need=[...new Set(Object.values(titles).flat())].filter(t=>t&&!filemap[t]);
console.log('\n頁面',Object.keys(titles).length,'未知檔名',need.length);
for(let i=0;i<need.length;i+=40){
  const batch=need.slice(i,i+40);
  const j=await jget(new URLSearchParams({action:'query',prop:'imageinfo',iiprop:'url',format:'json',titles:batch.map(x=>'文件:'+x).join('|')}).toString());
  if(j&&j.query){
    const norm={};(j.query.normalized||[]).forEach(x=>norm[x.to]=x.from);
    for(const pg of Object.values(j.query.pages)) if(pg.imageinfo)
      filemap[(norm[pg.title]||pg.title).replace(/^文件:/,'')]=pg.imageinfo[0].url;
  }
  process.stdout.write(`\r解析 ${Math.min(i+40,need.length)}/${need.length}   `);
  await sleep(1300);
}
fs.writeFileSync('filemap.json',JSON.stringify(filemap));
console.log('\nfilemap 總數',Object.keys(filemap).length);
// 重建 pagemap（title -> url）
const pagemap={};
for(const [pg,ts] of Object.entries(titles)){const m={};for(const t of ts)if(filemap[t])m[t]=filemap[t];pagemap[pg]=m;}
fs.writeFileSync('pagemap.json',JSON.stringify(pagemap));
console.log('pagemap 完成');
