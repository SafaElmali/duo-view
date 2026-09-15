import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_PREVIEW} from '../dist/share-preview.mjs';
import {exportConfiguration,reusableExportCapture,exportCrop,exportFilename,acquireExportCapture,localPaintReference,loadExportImage} from '../dist/export-preview.mjs';
const base={...DEFAULT_PREVIEW,content:'website',url:'https://example.com/'};

test('folded and open image poses capture their real responsive viewport',()=>{
 const folded=exportConfiguration(base,'folded'),open=exportConfiguration(base,'open'),table=exportConfiguration({...base,orientation:'landscape'},'tabletop');
 assert.equal(folded.size.width,466);assert.equal(folded.size.contentHeight,678);assert.equal(folded.state.foldAngle,0);
 assert.equal(open.size.width,626);assert.equal(open.size.contentHeight,890);assert.equal(open.state.foldAngle,180);
 assert.equal(table.size.width,890);assert.equal(table.size.contentHeight,626);assert.equal(base.display,'open');
 assert.throws(()=>exportConfiguration(base,'unknown'),/valid image pose/);
});
test('custom viewport and browser chrome are reflected accurately in export dimensions',()=>{
 const custom={...base,custom:{width:800,height:600},chrome:true};
 assert.deepEqual(exportConfiguration(custom,'folded').size,{width:800,height:600,contentHeight:498,outerWidth:826,outerHeight:626});
});
test('only completed captures matching the requested viewport are reused',()=>{
 const {size}=exportConfiguration(base,'open'),capture={image:'https://example.com/capture.png',width:626,height:2200};
 assert.equal(reusableExportCapture(capture,size),true);
 for(const overrides of [{pending:true},{error:'failed'},{width:466},{height:800},{height:NaN},{image:''}])assert.equal(reusableExportCapture({...capture,...overrides},size),false);
});
test('full-page screenshots crop from the top without rescaling their responsive width',()=>{
 const {size}=exportConfiguration(base,'open');
 assert.deepEqual(exportCrop(626,9000,size),{x:0,y:0,width:626,height:890});
 assert.throws(()=>exportCrop(1000,9000,size),/does not match/);
 assert.throws(()=>exportCrop(626,400,size),/does not match/);
});
test('matching cached snapshot bypasses the provider and local adapter',async()=>{
 const config=exportConfiguration(base,'open'),record={image:'https://images.example.com/capture.png',width:626,height:1200};
 assert.equal(await acquireExportCapture({...config,getExistingCapture:({state,size})=>{assert.equal(state.url,base.url);assert.equal(size.width,626);return record;},getLocalCapture:()=>assert.fail('local adapter should not run'),capture:()=>assert.fail('provider should not run')}),record);
});
test('local examples bypass the public screenshot provider',async()=>{
 const config=exportConfiguration({...base,url:'http://localhost:4317/demo.html'},'open'),record={canvas:{},width:626,height:890,kind:'local'};
 assert.equal(await acquireExportCapture({...config,getLocalCapture:()=>record,capture:()=>assert.fail('local URL must not leave this computer')}),record);
});
test('wrong local viewport produces a visible failure instead of fake success',async()=>{
 const config=exportConfiguration({...base,url:'http://localhost:4317/demo.html'},'open');
 await assert.rejects(acquireExportCapture({...config,getLocalCapture:()=>({canvas:{},width:390,height:844}),capture:()=>assert.fail()}),/could not be captured at this viewport/);
});
test('private and access-bearing URLs never fall through to the public screenshot provider',async()=>{
 for(const url of ['http://localhost:4317/','http://192.168.0.1/','https://example.com/?token=private','https://example.com/#secret']){
  await assert.rejects(acquireExportCapture({...exportConfiguration({...base,url},'open'),capture:()=>assert.fail('private URL sent to provider')}));
 }
});
test('public capture errors are propagated and cancellation prevents any acquisition',async()=>{
 const config=exportConfiguration(base,'open');
 await assert.rejects(acquireExportCapture({...config,capture:()=>{throw new Error('Service limit');}}),/Service limit/);
 const controller=new AbortController();controller.abort();
 await assert.rejects(acquireExportCapture({...config,signal:controller.signal,getExistingCapture:()=>assert.fail()}),{name:'AbortError'});
});
test('player never exports a website from a stale URL',async()=>{
 await assert.rejects(acquireExportCapture({...exportConfiguration({...base,content:'player'},'tabletop'),getExistingCapture:()=>({image:'https://example.com/stale.png',width:626,height:890}),capture:()=>assert.fail('player must not export website')}),/streaming demo is not ready/);
});
test('download filenames omit private page paths, query strings, and fragments',()=>{
 assert.equal(exportFilename({...base,url:'https://example.com/private-path?customer=name#part'},'open'),'duo-view-example.com-open-portrait.png');
 assert.equal(exportFilename({...base,content:'player'},'tabletop'),'duo-view-streaming-demo-tabletop-portrait.png');
});


test('SVG gradients retain local paint references after styles are cloned',()=>{
 const base='http://localhost:4318/examples/storefront.html';
 assert.equal(localPaintReference('#vase',base),'#vase');
 assert.equal(localPaintReference(base+'#vase',base),'#vase');
 assert.equal(localPaintReference('./storefront.html#vase',base),'#vase');
 assert.equal(localPaintReference('https://example.com/paint.svg#vase',base),null);
 assert.equal(localPaintReference('./different.svg#vase',base),null);
 assert.equal(localPaintReference(base+'?different=true#vase',base),null);
});


function installExportImageMock(context,onSource){
 const original=Object.getOwnPropertyDescriptor(globalThis,'Image');
 class ImageMock{set src(value){onSource(this,value);}}
 Object.defineProperty(globalThis,'Image',{value:ImageMock,configurable:true});
 context.after(()=>{if(original)Object.defineProperty(globalThis,'Image',original);else delete globalThis.Image;});
}
test('public exports refresh the CORS image cache and release their decoded blob URL',async context=>{
 const signal=new AbortController().signal,requests=[],decoded=[],revoked=[];
 context.mock.method(globalThis,'fetch',async (src,options)=>{requests.push({src,options});return {ok:true,type:'cors',blob:async()=>new Blob(['png'],{type:'image/png'})};});
 context.mock.method(URL,'createObjectURL',blob=>{assert.equal(blob.type,'image/png');return 'blob:export-cors-image';});
 context.mock.method(URL,'revokeObjectURL',url=>revoked.push(url));
 installExportImageMock(context,(image,src)=>{decoded.push(src);if(src)queueMicrotask(()=>image.onload?.());});
 const image=await loadExportImage('https://images.example.com/capture.png',signal);
 assert.equal(image.crossOrigin,'anonymous');
 assert.deepEqual(requests,[{src:'https://images.example.com/capture.png',options:{mode:'cors',credentials:'omit',referrerPolicy:'no-referrer',cache:'reload',signal}}]);
 assert.deepEqual(decoded,['blob:export-cors-image']);assert.deepEqual(revoked,['blob:export-cors-image']);
});
test('CORS fetch failures are visible and cannot fall back to unsafe direct image loading',async context=>{
 context.mock.method(globalThis,'fetch',async()=>{throw new TypeError('Failed to fetch');});
 installExportImageMock(context,()=>assert.fail('failed CORS fetch must not decode an unsafe image'));
 await assert.rejects(loadExportImage('https://images.example.com/capture.png'),/block image access \(CORS\)/);
});
test('image decoding cancellation revokes the temporary blob and preserves AbortError',async context=>{
 const controller=new AbortController(),revoked=[];
 context.mock.method(globalThis,'fetch',async()=>({ok:true,type:'cors',blob:async()=>new Blob(['png'],{type:'image/png'})}));
 context.mock.method(URL,'createObjectURL',()=> 'blob:export-cancelled');
 context.mock.method(URL,'revokeObjectURL',url=>revoked.push(url));
 installExportImageMock(context,(_image,src)=>{if(src)queueMicrotask(()=>controller.abort());});
 await assert.rejects(loadExportImage('https://images.example.com/capture.png',controller.signal),{name:'AbortError'});
 assert.deepEqual(revoked,['blob:export-cancelled']);
});
test('local SVG data images decode directly without a network fetch or temporary object URL',async context=>{
 const src='data:image/svg+xml;charset=utf-8,<svg></svg>',decoded=[];
 context.mock.method(globalThis,'fetch',()=>assert.fail('local SVG must not make a request'));
 context.mock.method(URL,'createObjectURL',()=>assert.fail('local SVG keeps its direct decode path'));
 installExportImageMock(context,(image,value)=>{decoded.push(value);queueMicrotask(()=>image.onload?.());});
 await loadExportImage(src);assert.deepEqual(decoded,[src]);
});
