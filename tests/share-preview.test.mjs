import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_PREVIEW,createPreviewLink,readPreviewLink,shareBase} from '../dist/share-preview.mjs';

const href='https://duo-view.netlify.app/',demoUrl=href+'demo.html';
const state=(changes={})=>({...DEFAULT_PREVIEW,url:demoUrl,...changes});
const create=(preview,options={})=>createPreviewLink(preview,{href,demoUrl,...options});
const read=hash=>readPreviewLink(hash,{base:href,demoUrl});

test('a public website and all device settings survive a share and fresh open',()=>{
 const preview=state({url:'https://example.com/ürün?filter=gold&sort=price#details',content:'website',display:'open',orientation:'landscape',view:'single',mode:'embedded',pose:'book',foldAngle:115,finish:'white',chrome:true,hinge:true,zoom:'0.75',custom:{width:820,height:1180}});
 assert.deepEqual(read(new URL(create(preview)).hash),{state:{...preview,url:new URL(preview.url).href},camera:null});
});

test('snapshot shares store the original website and restore capture mode',()=>{
 const preview=state({url:'https://www.madissongold.com/',content:'website',mode:'snapshot',pose:'flat',foldAngle:180});
 const url=create({...preview,snapshot:{image:'https://temporary-image.example/capture.jpg'},scroll:800});
 assert.deepEqual(read(new URL(url).hash).state,preview);
 assert.ok(!url.includes('temporary-image'));assert.ok(!url.includes('scroll'));
});

test('all layouts, orientations, displays, and zoom selections restore',()=>{
 for(const view of ['three','single','compare'])for(const orientation of ['portrait','landscape'])for(const display of ['open','folded'])for(const zoom of ['fit','0.5','0.75','1']){
  const preview=state({view,orientation,display,zoom,content:'website',foldAngle:display==='folded'?0:180,pose:'flat'});
  assert.deepEqual(read(new URL(create(preview)).hash).state,preview);
 }
});

test('streaming and built-in website shares use the recipient demo and omit an unrelated URL',()=>{
 const link=create(state({url:'https://example.com/previous-website'}));
 assert.ok(!link.includes('previous-website'));
 const remote=readPreviewLink(new URL(link).hash,{base:'https://other-duo.example/',demoUrl:'https://other-duo.example/demo.html'});
 assert.equal(remote.state.url,'https://other-duo.example/demo.html');assert.equal(remote.state.content,'player');
 assert.equal(read(new URL(create(state({content:'website'}))).hash).state.content,'website');
});

test('camera bearing and zoom survive multiple manual revolutions without huge links',()=>{
 const camera={yaw:Math.PI*12+.6,pitch:-Math.PI*10-.4,zoom:1.25};
 const restored=read(new URL(create(state(),{camera})).hash).camera;
 assert.deepEqual(restored,{yaw:.6,pitch:-.4,zoom:1.25});
 assert.equal(read(new URL(create(state({view:'single',content:'website'}),{camera})).hash).camera,null);
});

test('local and file builds share the production site; hosted previews retain their origin and path',()=>{
 for(const local of ['http://127.0.0.1:4317/','http://localhost:4317/?a=1#old','file:///tmp/duo/dist/index.html'])assert.equal(shareBase(local),href+'studio/');
 assert.equal(shareBase('https://preview.example/duo/?token=123#old'),'https://preview.example/duo/studio/');
 const localDemo='http://127.0.0.1:4317/demo.html';
 assert.equal(new URL(createPreviewLink(state({url:localDemo}),{href:'http://127.0.0.1:4317/',demoUrl:localDemo})).origin,new URL(href).origin);
});

test('unrelated anchors are ignored, versioned links and numeric values are validated atomically',()=>{
 assert.equal(read('#workspace'),null);assert.equal(read(''),null);
 for(const suffix of ['duo=2','duo=1&duo=1','duo=1&view=bad','duo=1&view=single&view=three','duo=1&angle=NaN','duo=1&angle=','duo=1&angle=181','duo=1&display=folded&angle=100','duo=1&chrome=yes','duo=1&width=820','duo=1&width=400.5&height=800','duo=1&camera=0,0,100','duo=1&camera=0,0','duo=1&camera=0,NaN,1','duo=1&camera=,0,1'])assert.throws(()=>read('#'+suffix),undefined,suffix);
 assert.throws(()=>read('#duo=1&extra='+'x'.repeat(16000)));
 assert.equal(read('#duo=1&url=https%3A%2F%2Fexample.com').state.content,'website');
});

test('share inputs cannot load executable schemes, private endpoints, credentials, or recurse into Duo',()=>{
 for(const url of ['javascript:alert(1)','data:text/html,test','file:///tmp/test.html','http://localhost:3000/','http://127.0.0.1/','https://router.local/','https://192.168.1.1/','https://[::1]/','https://user:pass@example.com/','https://example.com/?access_token=secret','https://example.com/#access_token=secret',href]){
  assert.throws(()=>create(state({url,content:'website'})),undefined,url);
  assert.throws(()=>read('#'+new URLSearchParams({duo:'1',url})),undefined,url);
 }
});

test('live hash routes are preserved but invalid snapshot URLs remain rejected',()=>{
 const url='https://example.com/#/products?category=gold';
 assert.equal(read(new URL(create(state({url,content:'website'}))).hash).state.url,url);
 assert.throws(()=>create(state({url,content:'website',mode:'snapshot'})));
});
