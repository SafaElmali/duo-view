# Duo View analytics

Connected to PostHog project 594399 (US Cloud). The public project key and ingestion host are in `dist/analytics-config.mjs`. Do not put a personal API key there. The static app loads the official PostHog browser SDK asynchronously; there is no build-time dependency. Analytics failure does not block the app.

Localhost and file previews are disabled by default. For verification, temporarily set `enableLocal: true`, reload, then restore it. Those events have `environment: development`; hosted events have `environment: production`. All events carry `app: duo_view` to separate them from other apps in this shared project.

## Properties and privacy

Shared properties describe display, orientation, layout, preview mode, content type, pose, finish, viewport dimensions, and whether content is the demo or a custom website. An allowlist excludes entered URLs, domains, free text, error messages, and snapshot image URLs. PostHog URL/referrer properties are excluded. Autocapture, session recording, heatmaps, error capture, and person profiles are disabled. An anonymous identifier uses local storage.

## Events

| Events | Meaning |
| --- | --- |
| `duo_opened` | App initialized |
| `duo_share_opened`, `duo_share_copied`, `duo_shared_preview_opened` | Share dialog, copy outcome (`success`), and a valid shared preview restored; no link or target URL included |
| `duo_device_settings_opened`, `duo_device_settings_closed` | Mobile settings panel buttons |
| `duo_preview_requested`, `duo_preview_validation_failed` | Valid website request or invalid input; no raw input included |
| `duo_preview_fallback` | Automatic snapshot fallback; `reason` is blocked, file-preview, or load-timeout |
| `duo_snapshot_started`, `duo_snapshot_ready`, `duo_snapshot_failed` | Capture lifecycle, requested width/height, elapsed milliseconds; canceled obsolete captures omitted |
| `duo_content_selected` | Website or Streaming selected |
| `duo_display_selected`, `duo_orientation_selected`, `duo_view_selected` | Folded/open, portrait/landscape, 3D/2D/compare controls |
| `duo_pose_selected`, `duo_finish_selected`, `duo_hinge_changed` | Pose, finish, and final hinge slider angle |
| `duo_preview_mode_selected`, `duo_preview_option_changed` | Auto/snapshot mode, browser chrome, hinge guide |
| `duo_preview_reloaded`, `duo_dimensions_changed`, `duo_dimensions_reset`, `duo_zoom_selected` | Reload and viewport controls |
| `duo_model_rotated`, `duo_model_zoomed` | Pointer/keyboard camera usage; at most one of each per 1.5 seconds |
| `duo_camera_reset`, `duo_front_back_clicked`, `duo_interaction_toggled` | Camera buttons and interaction mode |
| `duo_keyboard_shortcut` | Orientation/display shortcut |
| `duo_expand_clicked`, `duo_model_downloaded`, `duo_help_opened` | Expand intent, model download click, help entry point |
| `duo_player_play_pause_clicked`, `duo_player_started`, `duo_player_paused` | Playback button intent plus actual playback changes; pauses also include switching away |
| `duo_player_failed`, `duo_player_playback_failed` | Media load failure or rejected playback |
| `duo_player_skip_clicked`, `duo_player_seeked` | Skip direction and final scrub position |
| `duo_player_mute_clicked`, `duo_player_volume_changed` | Mute button intent and actual mute state |
| `duo_player_speed_changed`, `duo_player_brightness_changed`, `duo_player_lock_changed` | Rate, brightness, and control lock |
| `duo_player_fullscreen_clicked`, `duo_player_credit_clicked` | Fullscreen intent and credit link click |

Controls inside third-party websites are not tracked. Native sliders emit on committed changes, not every movement. Snapshot events describe capture outcomes; live iframe load is not reported as success because cross-origin iframe load events cannot reliably prove the website rendered.

## Verification

Run `node --test tests/analytics.test.mjs`. Tests cover property filtering, local defaults, early event queuing, gesture rate limits, SDK failure isolation, and control mapping. Browser verification confirmed `duo_opened`, `duo_content_selected`, and `duo_view_selected` arriving in PostHog Activity from the actual app, with no URL / Screen value.

SDK reference: https://posthog.com/docs/libraries/js
Configuration reference: https://posthog.com/docs/libraries/js/config
