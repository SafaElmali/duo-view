import {validateSnapshotUrl} from './snapshot.mjs';

async function checkEmbedding(url,signal){
 const response=await fetch('/.netlify/functions/embed-check',{
  method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url}),signal,credentials:'omit',referrerPolicy:'no-referrer'
 });
 if(!response.ok)throw new Error('Embedding check unavailable.');
 return response.json();
}
export function createEmbedFallback({onChange,onBlocked,onUnavailable=()=>{},check=checkEmbedding,protocol=globalThis.location?.protocol}){
 let current=null,controller=null,version=0,status='idle';
 const cache=new Map();
 function publish(next){status=next;onChange();}
 return {
  getState:()=>status,
  retry(){current=null;cache.clear();},
  update(url,enabled){
   const key=enabled?url:null;if(key===current)return;
   current=key;const request=++version;controller?.abort();controller=null;
   if(!key){publish('idle');return;}
   try{validateSnapshotUrl(url);if(new URL(url).port)throw new Error();}
   catch{publish('local');return;}
   // A file preview has no server endpoint to inspect embedding headers.
   if(protocol==='file:'){publish('unavailable');onUnavailable(url);return;}
   const finish=result=>{
    if(request!==version)return;
    const next=['blocked','allowed'].includes(result?.status)?result.status:'unknown';
    cache.set(url,next);if(cache.size>32)cache.delete(cache.keys().next().value);
    publish(next);if(next==='blocked')onBlocked(url);
   };
   if(cache.has(url)){finish({status:cache.get(url)});return;}
   controller=new AbortController();const signal=controller.signal;
   const timer=setTimeout(()=>controller?.signal===signal&&controller.abort(),10000);
   publish('checking');
   Promise.resolve().then(()=>check(url,signal)).then(finish,()=>finish({status:'unknown'})).finally(()=>clearTimeout(timer));
  }
 };
}
