# Duo View — marketing film

28 seconds · 1920 × 1080 · 30 fps · landscape · H.264 MP4 with stereo AAC.

The film uses the actual Duo View phone geometry, captures of its FIELDNOTES demo, and an animated recreation of the app's streaming controls. All motion is deterministic and driven by Remotion's frame clock. It is a product demonstration, not a recording of iOS or an Apple advertisement.

## Edit and render

Requires Node.js 22 or newer.

```sh
npm ci
npm run studio
npm run stills
npm run render
```

The renderer uses installed Google Chrome on macOS when available, otherwise Remotion's browser. Output is saved to `out/duo-view-marketing-1080p.mp4`. Render a particular preview with `node scripts/render.mjs --stills --frame=565`.

- `src/video.jsx`: scene timing, copy, brand colors, transitions, end card.
- `src/phone.jsx`: folding, camera motion, screen textures, scrolling, playback demonstration.
- `src/duo-model.mjs`: original model from the app, using the npm Three.js package.
- `public/`: bundled assets; rendering requires no external screenshot API or remote assets.
- `scripts/make-score.py`: original synthesized score; requires Python with NumPy only if regenerating audio.

## Storyboard

| Time | Scene |
| --- | --- |
| 0–4s | “The web. In a new shape.” — phone unfolds |
| 4–10s | “One URL. Every angle.” — folded, open, portrait, landscape |
| 10–16s | “Scroll. Across the fold.” — synchronized snapshot scrolling |
| 16–22s | “Big screen. Hands-on controls.” — play, seek, and playback speed |
| 22–28s | “Your website. In every fold.” — product and call to action |

## Credits and sources

- Product: Duo View — https://duo-view-safa.netlify.app/
- Phone geometry and FIELDNOTES website: original assets from https://github.com/SafaElmali/duo-view. Website images captured from `/demo.html` at 466 × 678, 626 × 890, and 890 × 626 CSS pixels, device scale factor 2, using Microlink's full-page screenshot API. They remain fully bundled for reproducible rendering.
- Video: **Sintel © Blender Foundation**, CC BY 3.0. https://durian.blender.org/sharing/ · https://creativecommons.org/licenses/by/3.0/. The bundled clip is an eight-second excerpt, starting at 14 seconds, from the app's existing teaser sourced from https://www.w3.org/2010/05/video/mediaevents. It is cropped and presented on the phone's display; audio is removed. Credit appears during the streaming scene.
- Music: “Duo pulse”, an original synthesized score created for this film. No sampled or licensed commercial music.
- Three.js: MIT; see `THIRD_PARTY_LICENSES.txt`.
- Remotion and other dependencies retain their own package licenses.

The simulator uses illustrative device dimensions. External websites must permit live embedding or use snapshot mode. Snapshot links and video are not interactive; the streaming segment demonstrates the dedicated interactive player.
