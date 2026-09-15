# SEO and AI search discovery

The public canonical URL is `https://duo-view.netlify.app/`. The app ships as static HTML; search engines can read its metadata, product summary, and FAQ answers without running the simulator.

## Included

- A descriptive title and description, canonical URL, language, author, Open Graph tags, and Twitter card with a bundled social image.
- Linked Schema.org `WebSite`, `WebPage`, `WebApplication`, and author entities. App features and limitations are backed by visible page content; no ratings or reviews are invented.
- An always-visible product summary and native HTML FAQ disclosures, each with a stable fragment link.
- `robots.txt` allows crawling and points to `sitemap.xml`, which lists the canonical app. Demo pages and the legacy launch page carry `noindex, follow`; they remain crawlable so engines can read that instruction.
- `llms.txt` provides an optional plain-text product guide with links to the same public FAQ answers and limitations. It is a convenience for tools that choose to read it, not a ranking factor or a guarantee of AI citations.

Google's [AI search guidance](https://developers.google.com/search/docs/appearance/ai-features) says existing SEO fundamentals apply, important content should be available as text, and structured data should match visible content. It requires no special AI markup or text file. See also Google's [noindex documentation](https://developers.google.com/search/docs/crawling-indexing/block-indexing).

## Maintenance and verification

Run `node --test tests/seo.test.mjs` after changing metadata, public copy, or routes. These checks cover the sitemap/indexing policy, entity relationships, local social assets, and guide links. Netlify runs them as part of the existing test gate. The local server serves `.txt` as `text/plain` and `.xml` as `application/xml`; after deployment, check these resources return HTTP 200 with the same content types.

Keep the product summary and guide consistent when features or limitations change. Keep FAQ IDs stable because the guide links to them. When moving domains, update canonical and social URLs, all structured-data IDs and references, `robots.txt`, `sitemap.xml`, and `llms.txt` together.

After deployment, the site owner can submit the sitemap and inspect the canonical page in [Google Search Console](https://search.google.com/search-console) and [Bing Webmaster Tools](https://www.bing.com/webmasters/). Search indexing and AI citation performance must be measured there; repository checks cannot confirm them.
