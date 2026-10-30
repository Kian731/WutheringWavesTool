const http=require('http'),fs=require('fs'),path=require('path'),url=require('url');
const root=path.join(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
http.createServer((req,res)=>{
  let p=decodeURIComponent(url.parse(req.url).pathname);
  if(p==='/')p='/index.html';
  const f=path.join(root,p);
  fs.readFile(f,(e,d)=>{
    if(e){res.writeHead(404);res.end('404');return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});
    res.end(d);
  });
}).listen(8777,()=>console.log('serving on http://localhost:8777'));
