import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {handleEmbedCheck} from '../server/embed-check.mjs';

const root=fileURLToPath(new URL('../dist/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.mp4':'video/mp4','.glb':'model/gltf-binary'};
createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,`http://${req.headers.host}`);
  const redirect={'/studio':'/studio/','/landing':'/','/landing/':'/','/landing/index.html':'/'}[url.pathname];
  if(redirect){res.writeHead(301,{Location:redirect+url.search}).end();return;}
  if(url.pathname==='/.netlify/functions/embed-check'){
   let body='';for await(const chunk of req){body+=chunk;if(body.length>4096){res.writeHead(413).end();return;}}
   const result=await handleEmbedCheck(new Request(url,{method:req.method,...(!['GET','HEAD'].includes(req.method)?{body}:{}),headers:req.headers}));
   res.writeHead(result.status,Object.fromEntries(result.headers));res.end(await result.text());return;
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
  const filename=path.resolve(root,'.'+decodeURIComponent(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));
  if(!filename.startsWith(root)){res.writeHead(403).end();return;}
  const info=await stat(filename);if(!info.isFile())throw new Error('Not found');
  let start=0,end=info.size-1,status=200;
  if(req.headers.range){
   const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
   if(!match||!match[1]&&!match[2]){res.writeHead(416,{'Content-Range':`bytes */${info.size}`}).end();return;}
   start=match[1]?Number(match[1]):Math.max(0,info.size-Number(match[2]));
   end=match[1]&&match[2]?Math.min(Number(match[2]),end):end;
   if(start>=info.size||start>end){res.writeHead(416,{'Content-Range':`bytes */${info.size}`}).end();return;}
   status=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${info.size}`);
  }
  res.writeHead(status,{'Content-Type':types[path.extname(filename)]||'application/octet-stream','Content-Length':Math.max(0,end-start+1),'Accept-Ranges':'bytes','Cache-Control':'no-store'});
  if(req.method==='HEAD'||!info.size){res.end();return;}
  const stream=createReadStream(filename,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
 }catch{if(!res.headersSent)res.writeHead(404);res.end('Not found');}
}).listen(Number(process.env.PORT||4317),'127.0.0.1',()=>console.log(`Duo View ready at http://127.0.0.1:${process.env.PORT||4317}`));
