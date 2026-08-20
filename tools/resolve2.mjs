import fs from 'fs';
const API='https://wiki.biligame.com/wutheringwaves/api.php';
const UA={'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
  'referer':'https://wiki.biligame.com/wutheringwaves/','accept':'application/json'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const map=fs.existsSync('filemap.json')?JSON.parse(fs.readFileSync('filemap.json','utf8')):{};
const save=()=>fs.writeFileSync('filemap.json',JSON.stringify(map));

async function jget(p){
  for(let a=0;a<6;a++){
    try{
      const r=await fetch(API+'?'+p,{headers:UA});
      const txt=await r.text();
      if(txt.startsWith('{'))return JSON.parse(txt);
      await sleep(4000*(a+1));            // 被 WAF 擋 → 等久一點
    }catch(e){await sleep(2500*(a+1));}
  }
  return null;
}
async function pull(prefix){
  let cont,got=0;
  do{
    const p=new URLSearchParams({action:'query',list:'allimages',aiprefix:prefix,ailimit:'500',aiprop:'url',format:'json'});
    if(cont)p.set('aicontinue',cont);
    const j=await jget(p.toString());
    if(!j||!j.query){return {got,fail:true};}
    for(const im of j.query.allimages)map[im.name.replace(/_/g,' ')]=im.url;
    got+=j.query.allimages.length;
    cont=j.continue&&j.continue.aicontinue;
    await sleep(1200);
  }while(cont);
  return {got,fail:false};
}
const raw=JSON.parse(fs.readFileSync('raw.json','utf8'));
const prefixes=['角色 ','技能 ','道具 ','声骸 ','声骸合鸣 ','武器 ','Mc wiki weapon ',...Object.keys(raw.chars)];
let i=0,fails=[];
for(const p of prefixes){
  const r=await pull(p);
  i++;
  console.log(`${i}/${prefixes.length} ${p} -> ${r.got}${r.fail?' (FAIL)':''}  總 ${Object.keys(map).length}`);
  if(r.fail)fails.push(p);
  save();
  await sleep(900);
}
console.log('失敗前綴:',fails.join(',')||'無');
