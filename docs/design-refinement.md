# Duo View design refinement — 2026-09-12

Target: `dist/index.html`, with application styling in `dist/studio.css`.

## Starting critique

Method: independent Impeccable assessments by `design_review` (visual/source review) and `design_detector` (mechanical/browser evidence). Both inspected fresh tabs. The design review completed before detector findings were synthesized.

The existing blue-and-white interface had a strong product-specific model and clear fold controls, but faint microtype, repeated pill containers, duplicated streaming choices, and excessive vertical chrome weakened the hierarchy.

| Heuristic | Starting score |
| --- | --- |
| System status | 3/4 |
| Match with real world | 3/4 |
| User control | 3/4 |
| Consistency | 2/4 |
| Error prevention | 3/4 |
| Recognition | 3/4 |
| Efficiency | 3/4 |
| Aesthetic/minimalist | 2/4 |
| Error recovery | 3/4 |
| Help/documentation | 3/4 |
| Total | 28/40 |

Priorities: P1 readability; P2 control consistency, sidebar density, preview space, and duplicated content selection. Small pale labels especially affect low-vision users; overlapping content/layout choices affect first-time users. Mobile must retain the existing settings sheet and usable touch controls.

The initial detector returned 68 candidates, including 34 contrast warnings. Its static interpretation includes hidden content and imperfect cascade/padding calculations, so counts are not independently confirmed defects. A post-implementation scan returned 35 candidates before the final small-text corrections. Remaining candidates included hidden legacy badges/player cards, deliberate device shadows, and the existing device size transition. No clean-scan or new heuristic score is claimed.

## Implemented direction

- Preserve the blue-and-white identity with a cool, plain preview surface and darker supporting text.
- Self-host Manrope with its OFL license. Use weight and spacing to distinguish headings, controls, and measurements.
- Keep the primary URL action blue. Use underline tabs for preview layouts and inset selections for device configuration.
- Put Folded/Open choices alongside each other, tighten the sidebar, and consolidate streaming selection into the persistent top switch.
- Reduce header and toolbar height; keep duplicate model instructions accessible but visually hidden to increase the rendering area.
- Keep the mobile settings dialog, overflow behavior, preview modes, and camera/player implementation intact.

## Verification

Visually inspected desktop 3D/2D, preview dropdown, 390px mobile 2D/settings, 320px streaming, and 844px short landscape. Confirmed no horizontal page overflow at 320px, 844px, and 1280px. Checked orientation changes, Website/Streaming and comparison switching, playback, front/back selected state, and camera reset. Final desktop/mobile pass confirmed the small-text and selected-hover refinements.

The browser reported a MutationObserver error without a source location, also seen during earlier page loads. No MutationObserver exists in the app source; this was not represented as an application regression or a clean console.

Questions skipped: the user already specified critique followed by implementation, including scope and mobile/functionality constraints. No overlay was injected because the available browser evaluation surface is read-only. Verification was performed against the local development preview before publishing.
