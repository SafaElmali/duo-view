import test from 'node:test';
import assert from 'node:assert/strict';
import {access} from 'node:fs/promises';
import {EXAMPLES,resolveExampleUrl,matchExampleUrl} from '../dist/example-gallery.mjs';

test('the gallery exposes four immutable, unique examples backed by bundled pages',async()=>{
 assert.equal(EXAMPLES.length,4);
 assert.equal(new Set(EXAMPLES.map(example=>example.id)).size,EXAMPLES.length);
 assert.ok(Object.isFrozen(EXAMPLES));
 for(const example of EXAMPLES){
  assert.ok(Object.isFrozen(example));assert.ok(example.title&&example.description&&example.category);
  await access(new URL(`../dist/${example.path}`,import.meta.url));
 }
});

test('examples resolve beneath each viewer hosting directory',()=>{
 for(const base of ['https://duo-view.netlify.app/','https://preview.example/tools/duo/index.html?token=1#old','http://localhost:4317/duo/','file:///tmp/duo/dist/index.html']){
  for(const example of EXAMPLES){
   const expected=new URL(`examples/${example.id}.html`,base).href;
   assert.equal(resolveExampleUrl(example.id,base),expected);
   assert.equal(matchExampleUrl(expected,base),example);
   assert.equal(matchExampleUrl(example.path,base),example);
  }
 }
});

test('only exact approved pages qualify as first-party examples',()=>{
 const base='https://duo.example/tools/index.html';
 for(const value of ['https://other.example/tools/examples/storefront.html','https://duo.example/examples/storefront.html','./examples/unknown.html','./demo.html','./examples/storefront.html?redirect=https://evil.example','./examples/storefront.html#access_token=secret','https://user:pass@duo.example/tools/examples/storefront.html','javascript:alert(1)','data:text/html,test','file:///tmp/examples/storefront.html','',null]){
  assert.equal(matchExampleUrl(value,base),null,String(value));
 }
});

test('unrecognized ids and unsafe or invalid hosting bases cannot manufacture URLs',()=>{
 for(const id of ['../index','./storefront','constructor','__proto__','STOREFRONT','storefront.html','https://evil.example',null,{},1])assert.equal(resolveExampleUrl(id,'https://duo.example/'),null);
 for(const base of ['javascript:alert(1)','data:text/html,test','ftp://duo.example/','https://user:password@duo.example/','not a url',undefined]){
  assert.equal(resolveExampleUrl('storefront',base),null);
  assert.equal(matchExampleUrl('./examples/storefront.html',base),null);
 }
});
