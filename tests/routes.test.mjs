import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import {siteBase, studioUrl, legacyStudioUrl} from '../dist/routes.mjs';
import {resolveExampleUrl} from '../dist/example-gallery.mjs';
import {isBuiltInWebsite} from '../dist/simulator.mjs';
import {createPreviewLink, DEFAULT_PREVIEW} from '../dist/share-preview.mjs';
import {createEmbedUrl} from '../dist/embed-preview.mjs';

test('Studio resolves shared content from the site root on production and subpath hosts', () => {
 for (const prefix of ['https://duo-view.netlify.app/', 'https://preview.example/tools/']) {
  for (const suffix of ['studio', 'studio/', 'studio/index.html?embed=1#duo=1']) {
   const href = prefix + suffix;
   assert.equal(siteBase(href), prefix);
   assert.equal(studioUrl(href), prefix + 'studio/');
   assert.equal(resolveExampleUrl('storefront', href), prefix + 'examples/storefront.html');
   assert.ok(isBuiltInWebsite(prefix + 'demo.html', href));
   assert.ok(!isBuiltInWebsite(prefix + 'studio/demo.html', href));
  }
 }
});

test('old preview and embed URLs retain every setting when forwarded to Studio', () => {
 for (const suffix of ['#duo=1&content=player&angle=100', '?embed=1#duo=1&example=storefront', '?layout=focus#duo=1&view=compare', '#preview-website']) {
  assert.equal(legacyStudioUrl('https://duo.example/'+suffix), 'https://duo.example/studio/'+suffix);
 }
 for (const suffix of ['', '#experience', '#questions', '#perspectives', '?utm_source=launch']) assert.equal(legacyStudioUrl('https://duo.example/'+suffix), null);
});

test('new local shares and embeds open the production Studio directly', () => {
 const href='http://127.0.0.1:4317/studio/', demoUrl='http://127.0.0.1:4317/demo.html';
 const link=createPreviewLink({...DEFAULT_PREVIEW, url:demoUrl}, {href,demoUrl});
 assert.equal(new URL(link).pathname,'/studio/');
 assert.equal(new URL(link).origin,'https://duo-view.netlify.app');
 assert.equal(new URL(createEmbedUrl(link)).pathname,'/studio/');
});

test('both entry pages resolve their local assets after the route move', async () => {
 const root=new URL('../dist/',import.meta.url);
 for(const path of ['index.html','studio/index.html']) {
  const html=await readFile(new URL(path,root),'utf8');
  const url=new URL(path,'https://duo.example/');
  for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
   const target=new URL(match[1],url);
   if(target.origin!==url.origin || !/\.(?:css|js|mjs|png|svg|ttf|glb|txt|html)$/.test(target.pathname)) continue;
   await access(new URL(target.pathname.slice(1),root));
  }
 }
});
