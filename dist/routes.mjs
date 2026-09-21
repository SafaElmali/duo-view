// Public routes and bundled content share a site root, including subpath hosts.
export function siteBase(href) {
 const url = new URL(href);
 url.search = ''; url.hash = '';
 url.pathname = url.pathname.replace(/\/studio(?:\/index\.html|\/)?$/, '/');
 return new URL('./', url).href;
}
export function studioUrl(href) {
 return new URL('studio/', siteBase(href)).href;
}
const helpAnchors = new Set(['faq', 'workspace', 'preview-website', 'snapshot-fallback', 'preview-interaction', 'share-preview-help', 'export-embed-help', 'mobile-support', 'viewport-estimates', 'independent-simulator']);
export function legacyStudioUrl(href) {
 const url = new URL(href);
 if (!new URLSearchParams(url.hash.slice(1)).has('duo') && !url.searchParams.has('embed') && !url.searchParams.has('layout') && !helpAnchors.has(url.hash.slice(1))) return null;
 const target = new URL(studioUrl(href));
 target.search = url.search; target.hash = url.hash;
 return target.href;
}
