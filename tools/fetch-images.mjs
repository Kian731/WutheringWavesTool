import fs from 'fs';
import path from 'path';import path from 'path';
const SITE = path.resolve('..');
const list=JSON.parse(fs.readFileSync('images.json','utf8'));
const UA={'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const valid=b=>b.length>400&&(b.slice(0,8).toString('hex')==='89504e470d0a1a0a'||b.slice(0,3).toString('hex')==='ffd8ff'||b.slice(0,4).toString()==='RIFF'||b.slice(0,3).toString()==='GIF');
let ok=0,skip=0,bytes=0;const fail=[];
async function one(it){
  const out=path.join(SITE,it.out);
  if(fs.existsSync(out)&&valid(fs.readFileSync(out))){skip++;return;}
  fs.mkdirSync(path.dirname(out),{recursive:true});
  const ref=it.url.includes('wuthering.gg')?'https://wuthering.gg/':'https://wiki.biligame.com/wutheringwaves/';
  for(let a=0;a<3;a++){
    try{const r=await fetch(it.url,{headers:{...UA,referer:ref}});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const b=Buffer.from(await r.arrayBuffer());
      if(!valid(b))throw new Error('bad image');
      fs.writeFileSync(out,b);ok++;bytes+=b.length;return;
    }catch(e){if(a===2)fail.push(it.out+' <- '+it.url+' ('+e.message+')');await sleep(400*(a+1));}
  }
}
let i=0;
async function worker(){while(i<list.length){await one(list[i++]);
  if((ok+skip+fail.length)%100===0)process.stdout.write(`\r${ok+skip+fail.length}/${list.length} 失敗 ${fail.length} ${(bytes/1e6).toFixed(0)}MB   `);}}
await Promise.all(Array.from({length:6},worker));
console.log(`\n下載 ${ok}，略過 ${skip}，失敗 ${fail.length}，共 ${(bytes/1e6).toFixed(1)} MB`);
if(fail.length){fs.writeFileSync('dlfail.txt',fail.join('\n'));console.log(fail.slice(0,15).join('\n'));}
