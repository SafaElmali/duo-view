# Landing page variants — September 21, 2026

The selected showcase is now the home page at `/`; the Focus simulator lives at `/studio/`.

- `/`: Home, with centered Manrope typography, light surfaces, graphite actions, four model poses, responsive comparison.
- `/landing/unfold/`: Unfold, with Archivo Black typography, a yellow launch poster, asymmetric composition, continuous hinge control, and editorial capability rows.

`/landing/` redirects home. The home page no longer displays the design variant picker.

Run `node scripts/serve.mjs` and open either route. Both use the existing original model and Three.js runtime. The page controls animate only on interaction, support keyboard rotation and reduced motion, and retain an example image when 3D cannot initialize. Fonts and demonstration images are self-hosted. Image origins are recorded in PNG metadata and `dist/landing/assets/PROVENANCE.md`.

## Verification

- JavaScript syntax and Git whitespace checks passed.
- All 16 focused existing model and preview-link tests passed (`node --test tests/duo-model.test.mjs tests/share-preview.test.mjs`).
- All local HTML links and assets returned HTTP 200: 11 unique URLs on Studio and 10 on Unfold.
- Simulator deep links parsed with the existing `readPreviewLink`; the comparison CTA opened the actual four-layout comparison in the browser.
- Browser checks covered pose selection, corrected tabletop screen orientation, FAQs, variant navigation, and Unfold slider endpoints at 0° and 180°.
- No document overflow at 320px, 390px, or 1440px in the checked routes.
- Full-page Chrome captures at 1440px and 390px are in `.impeccable/review/`. Earlier malformed in-app browser captures were replaced with valid Chrome captures.
- The static design detector ran once. Small functional labels were increased. Device-frame shadows and compact control padding were assessed in the visual review, rather than interpreted as automatic failures.
- An independent reviewer, using the skill's fallback review protocol because its named agent role was not available, confirmed the distinct compositions and found one material overlap from the floating variant switch. It was moved to a dedicated normal-flow strip. The reviewer's final verdict was **ship**, scoped to the resolved overlap fix, with all four updated captures checked.

These are local, uncommitted changes. No deployment was performed.
