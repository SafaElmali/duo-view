![Duo View — Your website, in every fold.](docs/assets/duo-view-cover.png)

# Duo View

Preview your website on an interactive foldable phone. Explore folded, open, and tabletop views, rotate the device, and compare responsive layouts side by side.

**[Open Studio](https://duo-view.netlify.app/studio/)** · [Visit the website](https://duo-view.netlify.app) · [Detailed guide](docs/guide.md)

Free to use. No account required. An independent concept, not affiliated with Apple.

## See it in action

https://github.com/user-attachments/assets/7a50e3c2-9c0e-4907-828e-6bdec2d0fb83

## What you can do

- **Explore every fold:** interactive 3D, a flat 2D view, portrait and landscape, and editable viewport sizes.
- **Compare layouts:** view all four presets or place a regular phone beside Duo.
- **Try real content:** paste a website URL, choose one of four built-in examples, or explore the video player.
- **Share your view:** copy a preview link, add a note, export a PNG, or embed the preview.

## Run locally

Requires **Node.js 22+**. No install or build step.

```sh
node scripts/serve.mjs
```

Open [localhost:4317](http://127.0.0.1:4317) for the website or [localhost:4317/studio/](http://127.0.0.1:4317/studio/) for the simulator.

Run the tests:

```sh
node --test tests/*.test.mjs
```

To deploy, connect the repository to Netlify. The included `netlify.toml` runs the tests and publishes `dist`; no API keys or environment variables are required.

## Know the limits

- Viewport presets are editable estimates, not validated Safari dimensions. Duo View uses your browser and does not emulate iOS or replace real-device testing.
- Websites must allow iframe embedding for live interaction. Blocked public pages can fall back to a static snapshot; snapshots send the URL and viewport dimensions to Microlink.
- Shared links restore preview settings, not scroll position, playback progress, or signed-in sessions. Local/private URLs and URLs with obvious access parameters cannot be shared.

See the [detailed guide](docs/guide.md) for controls, snapshot behavior, the 3D model, and media credits. Maintainers can also read the [SEO guide](docs/seo-geo.md) and [analytics notes](docs/analytics.md).
