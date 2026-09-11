import test from 'node:test';
import assert from 'node:assert/strict';
import {embeddingPolicy} from '../server/embed-policy.mjs';
import {inspectEmbedding,isPublicIPv4,publicPage,handleEmbedCheck} from '../server/embed-check.mjs';

const origin='https://duo-view.netlify.app',page='https://example.com/article';
test('explicit framing restrictions block the simulator while ordinary pages remain live',()=>{
 for(const value of ['DENY','SAMEORIGIN'])assert.equal(embeddingPolicy({'x-frame-options':value},page,origin).status,'blocked');
 assert.equal(embeddingPolicy({'x-frame-options':'SAMEORIGIN'},page,'https://example.com').status,'allowed');
 assert.equal(embeddingPolicy({},page,origin).status,'allowed');
 assert.equal(embeddingPolicy({'content-security-policy':"default-src 'none'"},page,origin).status,'allowed');
 assert.equal(embeddingPolicy({'content-security-policy-report-only':"frame-ancestors 'none'"},page,origin).status,'allowed');
});
test('CSP frame-ancestors takes precedence and handles allowlists and multiple policies',()=>{
 const policy=value=>embeddingPolicy({'content-security-policy':value,'x-frame-options':'DENY'},page,origin).status;
 for(const value of ["'none'","'self'",'https://other.netlify.app'])assert.equal(policy('frame-ancestors '+value),'blocked');
 for(const value of ['https://duo-view.netlify.app','https://*.netlify.app','https:','*'])assert.equal(policy('frame-ancestors '+value),'allowed');
 assert.equal(policy("frame-ancestors *; script-src 'none', frame-ancestors 'self'"),'blocked');
 assert.equal(policy('frame-ancestors https://duo-view.netlify.app/some-path'),'unknown');
 assert.equal(policy('frame-ancestors https://*.view.netlify.app'),'blocked');
});
test('scheme, port and wildcard matching do not confuse lookalike origins',()=>{
 assert.equal(embeddingPolicy({'content-security-policy':'frame-ancestors https://duo-view.netlify.app'},page,'https://duo-view.netlify.app.evil.test').status,'blocked');
 assert.equal(embeddingPolicy({'content-security-policy':'frame-ancestors https://duo-view.netlify.app:8443'},page,origin).status,'blocked');
 assert.equal(embeddingPolicy({'content-security-policy':"frame-ancestors 'self'"},'http://example.com','https://example.com').status,'allowed');
 assert.equal(embeddingPolicy({'content-security-policy':'frame-ancestors http://example.com:80'},page,'https://example.com').status,'allowed');
});
test('redirects are checked at their final destination and cannot reach private URLs',async()=>{
 const visited=[];
 const read=async url=>{visited.push(url.href);return visited.length===1?{status:302,headers:{location:'https://example.org/final'}}:{status:200,headers:{'x-frame-options':'DENY'}};};
 assert.equal((await inspectEmbedding(page,origin,{read})).status,'blocked');
 assert.deepEqual(visited,[page,'https://example.org/final']);
 let requests=0;
 await assert.rejects(inspectEmbedding(page,origin,{read:async()=>{requests++;return {status:302,headers:{location:'http://127.0.0.1/private'}};}}));
 assert.equal(requests,1);
 assert.equal((await inspectEmbedding(page,origin,{read:async()=>({status:403,headers:{}})})).status,'unknown');
 assert.equal((await inspectEmbedding(page,origin,{read:async()=>({status:302,headers:{location:page}})})).status,'unknown');
});
test('URL and DNS checks exclude private, metadata, special-purpose and credential-bearing destinations',()=>{
 for(const url of ['http://127.0.0.1','http://shop.internal','https://example.com:8443','https://example.com?session=secret','https://user:pass@example.com','https://example.com#secret'])assert.throws(()=>publicPage(url));
 for(const address of ['0.0.0.0','10.0.0.1','100.100.100.200','127.0.0.1','169.254.169.254','172.16.0.1','192.168.1.1','192.0.0.1','198.18.0.1','198.51.100.1','203.0.113.1','224.0.0.1','255.255.255.255','::1'])assert.equal(isPublicIPv4(address),false,address);
 assert.equal(isPublicIPv4('93.184.215.14'),true);
 assert.equal(isPublicIPv4('192.0.78.24'),true);
});
test('uncheckable inputs produce unknown rather than a false blocked result',async()=>{
 const response=await handleEmbedCheck(new Request(origin+'/.netlify/functions/embed-check',{method:'POST',body:JSON.stringify({url:'http://localhost:4317'})}));
 assert.equal((await response.json()).status,'unknown');
 assert.equal((await handleEmbedCheck(new Request(origin))).status,405);
});
