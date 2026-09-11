import test from 'node:test';
import assert from 'node:assert/strict';
import {createEmbedFallback} from '../dist/embed-fallback.mjs';
const tick=()=>new Promise(resolve=>setImmediate(resolve));

function fixture(){
 const requests=[],blocked=[],states=[];
 const fallback=createEmbedFallback({onChange:()=>states.push(fallback.getState()),onBlocked:url=>blocked.push(url),check:(url,signal)=>new Promise((resolve,reject)=>requests.push({url,signal,resolve,reject}))});
 return {fallback,requests,blocked,states};
}
test('confirmed blocked pages fall back once and repeated viewport updates do not recheck',async()=>{
 const f=fixture(),url='https://example.com/';f.fallback.update(url,true);await tick();
 f.fallback.update(url,true);assert.equal(f.requests.length,1);
 f.requests[0].resolve({status:'blocked'});await tick();
 assert.deepEqual(f.blocked,[url]);assert.deepEqual(f.states,['checking','blocked']);
});
test('permitted pages and failed checks stay in live mode',async()=>{
 const f=fixture();f.fallback.update('https://example.com/',true);await tick();
 f.requests[0].resolve({status:'allowed'});await tick();
 assert.equal(f.fallback.getState(),'allowed');assert.deepEqual(f.blocked,[]);
 f.fallback.update('https://example.org/',true);await tick();f.requests[1].reject(new Error('Offline'));await tick();
 assert.equal(f.fallback.getState(),'unknown');assert.deepEqual(f.blocked,[]);
});
test('a late response cannot replace a newer website, a manual snapshot, or the player',async()=>{
 const f=fixture();f.fallback.update('https://example.com/',true);await tick();
 f.fallback.update('https://example.org/',true);await tick();
 assert.equal(f.requests[0].signal.aborted,true);
 f.requests[0].resolve({status:'blocked'});await tick();assert.deepEqual(f.blocked,[]);
 f.fallback.update('https://example.org/',false);f.requests[1].resolve({status:'blocked'});await tick();
 assert.deepEqual(f.blocked,[]);assert.equal(f.fallback.getState(),'idle');
});
test('local and private URLs are never sent, and reload can retry an unknown check',async()=>{
 const f=fixture();for(const url of ['http://localhost:4317/','https://example.com?token=private'])f.fallback.update(url,true);
 await tick();assert.equal(f.requests.length,0);assert.equal(f.fallback.getState(),'local');
 f.fallback.update('https://example.com/',true);await tick();f.requests[0].resolve({status:'unknown'});await tick();
 f.fallback.retry();f.fallback.update('https://example.com/',true);await tick();
 assert.equal(f.requests.length,2);f.requests[1].resolve({status:'allowed'});await tick();
});
