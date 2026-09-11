import test from 'node:test';
import assert from 'node:assert/strict';
import {dimensions,normalizeUrl,fitScale,windowPreviewConfig} from '../dist/simulator.mjs';
test('all four presets create the intended CSS viewport',()=>{
  assert.deepEqual([dimensions('folded','portrait').width,dimensions('folded','portrait').contentHeight],[466,678]);
  assert.deepEqual([dimensions('folded','landscape').width,dimensions('folded','landscape').contentHeight],[678,466]);
  assert.deepEqual([dimensions('open','portrait').width,dimensions('open','portrait').contentHeight],[626,890]);
  assert.deepEqual([dimensions('open','landscape').width,dimensions('open','landscape').contentHeight],[890,626]);
});
test('browser chrome reduces content area without changing screen size',()=>{const size=dimensions('open','landscape',true);assert.equal(size.height,626);assert.equal(size.contentHeight,524);assert.equal(size.outerWidth,916);});
test('custom dimensions preserve width and validate both bounds',()=>{assert.equal(dimensions('folded','portrait',false,{width:768,height:1024}).contentHeight,1024);assert.throws(()=>dimensions('open','portrait',false,{width:10,height:800}));assert.throws(()=>dimensions('open','portrait',false,{width:400.5,height:800}));});
test('URLs accept public and local development pages and preserve queries',()=>{assert.equal(normalizeUrl('example.com/test?x=1','http://localhost:4317'),'https://example.com/test?x=1');assert.equal(normalizeUrl('localhost:3000','http://localhost:4317'),'http://localhost:3000/');assert.equal(normalizeUrl('http://127.0.0.1:8080/','http://localhost:4317'),'http://127.0.0.1:8080/');});
test('unsafe schemes, mixed content, embedded credentials, and recursion are rejected',()=>{for(const url of ['javascript:alert(1)','data:text/html,test','file:///tmp/test.html','https://user:pass@example.com/','https://duo.example/'])assert.throws(()=>normalizeUrl(url,'https://duo.example/'));assert.throws(()=>normalizeUrl('http://example.com','https://duo.example/'));});
test('fitting scales display without changing CSS viewport dimensions',()=>{const size=dimensions('open','landscape');const scale=fitScale(size,400,600);assert.ok(size.outerWidth*scale<=400);assert.equal(size.width,890);assert.equal(fitScale(size,400,600,'1'),1);});

test('direct windows accept HTTP without weakening embedded-mode validation',()=>{assert.equal(normalizeUrl('http://example.com','https://duo.example/',{embedded:false}),'http://example.com/');assert.throws(()=>normalizeUrl('javascript:alert(1)','https://duo.example/',{embedded:false}));});
test('window launch requests content dimensions for all four presets',()=>{for(const display of ['folded','open'])for(const orientation of ['portrait','landscape']){const config=windowPreviewConfig('https://x.com/',display,orientation,true);const size=dimensions(display,orientation,true);assert.equal(config.width,size.width);assert.equal(config.height,size.contentHeight);assert.match(config.features,new RegExp('width='+size.width+',height='+size.contentHeight));assert.equal(config.url,'https://x.com/');}});
