import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSnapshotUrl,screenshotRequest,captureSnapshot,snapshotDocument} from '../dist/snapshot.mjs';

test('private addresses and access-bearing URLs never reach the screenshot provider',()=>{
 for(const url of ['http://localhost:4317','http://127.0.0.1','http://10.0.0.5','http://[::1]','http://shop.internal','https://user:password@example.com','https://example.com?token=secret','https://example.com#access_token=secret'])assert.throws(()=>validateSnapshotUrl(url));
 assert.equal(validateSnapshotUrl('https://www.madissongold.com/'),'https://www.madissongold.com/');
});
test('each orientation requests real viewport dimensions, not a resized desktop image',()=>{
 for(const [width,height]of[[626,890],[890,626],[466,678],[678,466]]){
  const url=new URL(screenshotRequest('https://example.com/',{width,contentHeight:height}));
  assert.equal(url.searchParams.get('viewport.width'),String(width));assert.equal(url.searchParams.get('viewport.height'),String(height));assert.equal(url.searchParams.get('viewport.deviceScaleFactor'),'1');
 }
});
test('a wrongly sized capture cannot be reported as a valid device preview',async context=>{
 context.mock.method(globalThis,'fetch',async()=>({ok:true,status:200,json:async()=>({status:'success',data:{screenshot:{url:'https://example.com/image.png',width:1200,height:1200}}})}));
 await assert.rejects(captureSnapshot('https://example.com/',{width:626,contentHeight:890}),/did not match/);
});
test('capture failure and rate limits are visible errors',async context=>{
 context.mock.method(globalThis,'fetch',async()=>({ok:false,status:429}));
 await assert.rejects(captureSnapshot('https://example.com/',{width:626,contentHeight:890}),/reached its limit/);
});
test('snapshot documents escape untrusted text and disable scripts',()=>{
 const doc=snapshotDocument({error:'<script>alert(1)</script>'});
 assert.ok(!doc.includes('<script>'));assert.ok(doc.includes('&lt;script&gt;'));assert.ok(doc.includes("default-src 'none'"));
});
