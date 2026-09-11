import {lookup} from 'node:dns/promises';
import {request as httpRequest} from 'node:http';
import {request as httpsRequest} from 'node:https';
import {validateSnapshotUrl} from '../dist/snapshot.mjs';
import {embeddingPolicy} from './embed-policy.mjs';

export function isPublicIPv4(address){
 const parts=address.split('.').map(Number);
 if(parts.length!==4||parts.some(value=>!Number.isInteger(value)||value<0||value>255))return false;
 const [a,b,c]=parts;
 return !(a===0||a===10||a===127||a>=224||a===100&&b>=64&&b<=127||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0&&(c===0||c===2)||b===88&&c===99)||a===198&&(b===18||b===19||b===51&&c===100)||a===203&&b===0&&c===113);
}
export function publicPage(raw){
 const url=new URL(validateSnapshotUrl(raw));
 if(url.port||url.href.length>2048)throw new Error('Unsupported public URL.');
 return url;
}
export async function readHeaders(url,signal){
 // Pin the connection to a checked address, including on every redirect.
 const addresses=await lookup(url.hostname,{family:4,all:true});
 signal.throwIfAborted();
 if(!addresses.length||addresses.some(item=>!isPublicIPv4(item.address)))throw new Error('Non-public destination.');
 const address=addresses[0];
 return new Promise((resolve,reject)=>{
  const request=(url.protocol==='https:'?httpsRequest:httpRequest)(url,{
   method:'GET',signal,agent:false,maxHeaderSize:16384,
   headers:{Accept:'text/html','User-Agent':'DuoView/1.0 (website embedding check)'},
   lookup:(_hostname,options,done)=>options.all?done(null,[address]):done(null,address.address,address.family)
  },response=>{
   resolve({status:response.statusCode,headers:response.headers});
   response.destroy();
  });
  request.on('error',reject);request.end();
 });
}
export async function inspectEmbedding(raw,ancestor,{read=readHeaders,signal=AbortSignal.timeout(8000)}={}){
 let url=publicPage(raw);
 for(let hop=0;hop<5;hop++){
  signal.throwIfAborted();
  const response=await read(url,signal);
  if([301,302,303,307,308].includes(response.status)&&response.headers.location){
   url=publicPage(new URL(response.headers.location,url).href);continue;
  }
  if(response.status<200||response.status>=400)return {status:'unknown',reason:'request-failed'};
  return embeddingPolicy(response.headers,url.href,ancestor);
 }
 return {status:'unknown',reason:'redirect-limit'};
}
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function handleEmbedCheck(request){
 if(request.method!=='POST')return json({status:'unknown'},405);
 try{
  const text=await request.text();if(text.length>4096)return json({status:'unknown'},413);
  const {url}=JSON.parse(text);publicPage(url);
  const signal=AbortSignal.timeout(8000);
  const result=await Promise.race([
   inspectEmbedding(url,new URL(request.url).origin,{signal}),
   new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}))
  ]);
  return json(result);
 }catch{return json({status:'unknown',reason:'check-unavailable'});}
}
