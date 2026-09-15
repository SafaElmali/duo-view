import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_PREVIEW,createPreviewLink,readPreviewLink} from '../dist/share-preview.mjs';
import {EXAMPLES,resolveExampleUrl} from '../dist/example-gallery.mjs';
import {normalizeUrl,isBuiltInWebsite} from '../dist/simulator.mjs';

const href='https://duo-view.netlify.app/',demoUrl=href+'demo.html';
const state=changes=>({...DEFAULT_PREVIEW,url:demoUrl,content:'website',...changes});
const read=hash=>readPreviewLink(hash,{base:href,demoUrl});

test('bundled examples shared locally reopen on the recipient host instead of localhost',()=>{
 const local='http://127.0.0.1:4318/';
 for(const example of EXAMPLES){
  const preview=state({url:resolveExampleUrl(example.id,local)});
  const link=createPreviewLink(preview,{href:local,demoUrl:local+'demo.html'});
  assert.equal(new URL(link).origin,new URL(href).origin);
  assert.equal(new URLSearchParams(new URL(link).hash.slice(1)).get('example'),example.id);
  assert.equal(read(new URL(link).hash).state.url,resolveExampleUrl(example.id,href));
  const remote='https://preview.example/duo/';
  assert.equal(readPreviewLink(new URL(link).hash,{base:remote,demoUrl:remote+'demo.html'}).state.url,resolveExampleUrl(example.id,remote));
 }
});

test('first-party examples are a narrow exception, never a route back into the simulator',()=>{
 for(const example of EXAMPLES){const url=resolveExampleUrl(example.id,href);assert.equal(normalizeUrl(url,href),url);assert.equal(isBuiltInWebsite(url,href),true);}
 for(const path of ['index.html','embed.html','examples/unknown.html','examples/../index.html','private/demo.html','examples/storefront.html?token=secret']){
  const url=new URL(path,href).href;assert.equal(isBuiltInWebsite(url,href),false);assert.throws(()=>normalizeUrl(url,href));
 }
 for(const query of ['example=unknown','example=../index.html','example=storefront&url=https%3A%2F%2Fexample.com'])assert.throws(()=>read('#duo=1&'+query));
});

test('annotations round-trip with their exact website viewport and keep note text inert',()=>{
 const annotation={note:'The CTA clips here <img src=x onerror=alert(1)>',rect:{x:.2,y:.3,width:.4,height:.25}};
 const preview=state({url:'https://example.com/page?category=design',view:'single',orientation:'landscape',custom:{width:820,height:640},annotation});
 const restored=read(new URL(createPreviewLink(preview,{href,demoUrl})).hash).state;
 assert.deepEqual(restored,preview);
 for(const suffix of ['note=','note=x&region=0,0,2,1','note=x&region=0,0,NaN,1','note=x&region=0,0,,1','note=x&region=0,0,0,1','note='+'x'.repeat(501)])assert.throws(()=>read('#duo=1&view=single&'+suffix));
 assert.throws(()=>read('#duo=1&note=x'));
});

test('phone comparison links preserve both comparison mode and reference viewport choice',()=>{
 for(const reference of ['compact','standard','large']){
  const preview=state({view:'compare',comparison:'phone',reference,orientation:'landscape',display:'open',custom:{width:900,height:650}});
  assert.deepEqual(read(new URL(createPreviewLink(preview,{href,demoUrl})).hash).state,preview);
 }
 assert.equal(read('#duo=1&view=compare').state.comparison,'poses');
 assert.throws(()=>read('#duo=1&comparison=unknown'));
 assert.throws(()=>read('#duo=1&reference=made-up-phone'));
});
