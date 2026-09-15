import test from 'node:test';
import assert from 'node:assert/strict';
import {createEmbedCode,createEmbedUrl,EMBED_HEIGHTS,initEmbeddedPreview} from '../dist/embed-preview.mjs';
import {createPreviewLink,readPreviewLink,DEFAULT_PREVIEW} from '../dist/share-preview.mjs';

const href='https://duo-view.netlify.app/',demoUrl=href+'demo.html';
const shared=changes=>createPreviewLink({...DEFAULT_PREVIEW,url:demoUrl,...changes},{href,demoUrl});

test('embed URL keeps the complete shared state and removes unrelated app query parameters',()=>{
 const original=shared({view:'single',content:'website',url:'https://example.com/path?q=a&sort=b#section',orientation:'landscape',custom:{width:900,height:600},annotation:{note:'Check the layout',rect:{x:.1,y:.2,width:.3,height:.4}}});
 const input=new URL(original);input.search='?utm_source=portfolio&embed=0&theme=old';
 const embedded=new URL(createEmbedUrl(input.href));
 assert.equal(embedded.search,'?embed=1');assert.equal(embedded.hash,new URL(original).hash);
 assert.deepEqual(readPreviewLink(embedded.hash,{base:href,demoUrl}),readPreviewLink(new URL(original).hash,{base:href,demoUrl}));
});

test('embed URLs retain custom deployments, examples, and phone comparison choices',()=>{
 const original='https://preview.example/duo/index.html#duo=1&example=storefront&view=compare&comparison=phone&reference=large';
 const result=new URL(createEmbedUrl(original));
 assert.equal(result.origin,'https://preview.example');assert.equal(result.pathname,'/duo/index.html');assert.equal(result.hash,new URL(original).hash);
 assert.equal(readPreviewLink(result.hash,{base:result.href,demoUrl:'https://preview.example/duo/demo.html'}).state.comparison,'phone');
});

test('embed code is responsive, lazy, and omits navigation and autoplay permissions',()=>{
 const code=createEmbedCode(shared({orientation:'landscape'}));
 assert.match(code,/width="100%"/);assert.match(code,/height="640"/);assert.match(code,/loading="lazy"/);assert.match(code,/referrerpolicy="no-referrer"/);
 assert.match(code,/sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"/);
 assert.doesNotMatch(code,/allow-top-navigation|autoplay|postMessage|<script/);
});

test('attribute escaping keeps titles and state from injecting markup',()=>{
 const title='A "preview" <img src=x onerror=alert(1)> & \'note\'';
 const code=createEmbedCode(shared({orientation:'landscape',view:'single',content:'website',annotation:{note:'"</iframe><script>alert(1)</script>',rect:null}}),{title});
 assert.match(code,/title="A &quot;preview&quot; &lt;img src=x onerror=alert\(1\)&gt; &amp; &#39;note&#39;"/);
 assert.match(code,/#duo=1&amp;/);assert.doesNotMatch(code,/<img|<script/);
 assert.equal((code.match(/<iframe/g)||[]).length,1);assert.equal((code.match(/<\/iframe>/g)||[]).length,1);
});

test('invalid embed heights cannot escape numeric dimensions or create unusable embeds',()=>{
 for(const height of [EMBED_HEIGHTS.min,480,640,800,EMBED_HEIGHTS.max])assert.match(createEmbedCode(shared(),{height}),new RegExp(`height="${height}"`));
 for(const height of [319,1201,0,-1,NaN,Infinity,640.5,'640','640" onload="alert(1)',null])assert.throws(()=>createEmbedCode(shared(),{height}),/embed height/);
});

test('nonpublic app URLs, private access links, and executable schemes are rejected',()=>{
 for(const url of ['javascript:alert(1)','data:text/html,test','file:///tmp/duo/index.html#duo=1','http://localhost:4317/#duo=1','http://test.localhost/#duo=1','http://127.0.0.1/#duo=1','https://192.168.1.1/#duo=1','https://[::1]/#duo=1','http://router.local/#duo=1','http://test.internal/#duo=1','https://user:pass@example.com/#duo=1','https://example.com/?access_token=private#duo=1'])assert.throws(()=>createEmbedUrl(url),undefined,url);
});

test('embed URL requires a valid shared payload and rejects nested private sites',()=>{
 for(const hash of ['','#workspace','#duo=2','#duo=1&duo=1','#duo=1&orientation=bad','#duo=1&display=folded&angle=180','#duo=1&url=javascript%3Aalert(1)','#duo=1&url=http%3A%2F%2Flocalhost%3A3000','#duo=1&note=x'])assert.throws(()=>createEmbedUrl(href+hash),undefined,hash);
});

test('ordinary previews remain untouched unless embed mode is explicitly enabled',()=>{
 for(const search of ['','?embed=0','?embedded=1']){
  const document={defaultView:{location:{href:href+search}},createElement:()=>assert.fail('normal app must not be changed')};
  const result=initEmbeddedPreview({document});assert.equal(result.active,false);result.update();result.destroy();
 }
});
