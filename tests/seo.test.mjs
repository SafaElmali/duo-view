import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {readPreviewLink} from '../dist/share-preview.mjs';

const root = new URL('../dist/', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const html = await read('studio/index.html');
const home = await read('index.html');
const origin = 'https://duo-view.netlify.app/';
const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)[1];
const meta = (source, name) => source.match(new RegExp(`<meta (?:name|property)="${name}" content="([^"]*)"`))?.[1];

test('the sitemap points to the indexable canonical app and robots allows crawlers to read it', async () => {
  const robots = await read('robots.txt');
  const sitemap = await read('sitemap.xml');
  assert.match(canonical, /^https:\/\//);
  assert.equal(new URL(canonical).hash, '');
  assert.equal(new URL(canonical).search, '');
  assert.match(meta(html, 'robots'), /\bindex\b/);
  assert.doesNotMatch(meta(html, 'robots'), /noindex|nofollow|nosnippet/);
  assert.match(robots, /User-agent: \*\s+Allow: \//);
  assert.ok(robots.includes(`Sitemap: ${origin}sitemap.xml`));
  assert.doesNotMatch(robots, /^Disallow:\s*\S/m);
  assert.deepEqual([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]), [origin, canonical]);
});

test('fictional examples and the legacy launch page opt out of indexing without blocking crawling', async () => {
  const examples = (await readdir(new URL('examples/', root))).filter(file => file.endsWith('.html'));
  for (const path of ['demo.html', 'launch.html', ...examples.map(file => `examples/${file}`)]) {
    const source = await read(path);
    assert.equal(meta(source.split('</head>')[0], 'robots'), 'noindex, follow', path);
  }
});

test('structured data connects the canonical page, app, site and creator without dangling entity references', () => {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(blocks.length, 1);
  const data = JSON.parse(blocks[0][1]);
  assert.equal(data['@context'], 'https://schema.org');
  const entities = new Map();
  const references = [];
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    if (value['@id']) {
      references.push(value['@id']);
      if (value['@type']) {
        assert.ok(!entities.has(value['@id']), `Duplicate entity: ${value['@id']}`);
        entities.set(value['@id'], value);
      }
    }
    Object.values(value).forEach(visit);
  }
  visit(data);
  for (const id of references) assert.ok(entities.has(id), `Missing entity: ${id}`);
  const page = entities.get(`${canonical}#webpage`);
  const app = entities.get(page.mainEntity['@id']);
  const site = entities.get(page.isPartOf['@id']);
  assert.equal(page['@type'], 'WebPage');
  assert.equal(app['@type'], 'WebApplication');
  assert.equal(site['@type'], 'WebSite');
  for (const entity of [page, app]) assert.equal(entity.url, canonical);
  assert.equal(site.url, origin);
  assert.equal(app.isPartOf['@id'], site['@id']);
  assert.equal(app.author['@id'], site.publisher['@id']);
  assert.equal(app.description, meta(html, 'description'));
  assert.equal(page.description, meta(html, 'description'));
  assert.ok(html.includes(`id="${new URL(app.softwareHelp.url).hash.slice(1)}"`));
});

test('social cards reference a real bundled image with matching dimensions', async () => {
  assert.equal(meta(html, 'og:url'), canonical);
  assert.equal(meta(html, 'twitter:card'), 'summary_large_image');
  const url = new URL(meta(html, 'og:image'));
  assert.equal(url.origin, new URL(canonical).origin);
  assert.equal(meta(html, 'twitter:image'), url.href);
  assert.ok(meta(html, 'og:image:alt'));
  const png = await readFile(new URL(url.pathname.slice(1), root));
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), Number(meta(html, 'og:image:width')));
  assert.equal(png.readUInt32BE(20), Number(meta(html, 'og:image:height')));
});

test('the AI guide reuses visible product facts and its FAQ links coexist with shared preview fragments', async () => {
  const guide = await read('llms.txt');
  const summary = html.match(/<p class="preview-help-description">([^<]+)<\/p>/)[1];
  assert.ok(guide.includes(`> ${summary}`));
  assert.ok(html.includes('<link rel="alternate" type="text/plain" href="../llms.txt"'));
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'Fragment IDs must be unique');
  const faqIds = [...html.matchAll(/<details id="([^"]+)"/g)].map(match => match[1]);
  assert.ok(faqIds.length > 0);
  for (const id of faqIds) assert.ok(guide.includes(`${canonical}#${id}`), `Missing FAQ guide link: ${id}`);
  for (const match of guide.matchAll(/\]\((https:[^)]+)\)/g)) {
    const url = new URL(match[1]);
    if (url.origin !== new URL(canonical).origin) continue;
    assert.ok(['/', '/studio/'].includes(url.pathname));
    if (!url.hash) continue;
    assert.ok(ids.includes(url.hash.slice(1)), `Broken guide link: ${url.href}`);
    assert.equal(readPreviewLink(url.hash, {base: canonical, demoUrl: `${canonical}demo.html`}), null);
  }
});

 test('home has its own canonical metadata and routes visitors into Studio', () => {
  assert.ok(home.includes('rel="canonical" href="'+origin+'"'));
  assert.equal(meta(home, 'og:url'), origin);
  assert.match(home, /href="\/studio\/"/);
  assert.doesNotMatch(home, /class="variant-switch"/);
  assert.ok(html.includes('href="../" aria-label="Duo View home"'));
 });
