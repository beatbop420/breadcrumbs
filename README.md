# Breadcrumbs

Breadcrumbs is a small family memory map app. It shows a world map, lets a user drop a pin, attach a short note and optional photo, and save it to Supabase. Typed place names can also trigger best-effort geocoding that moves the temporary marker while the user is filling out the form. Saved memories can be opened later, marked as seen, edited by their owner, deleted by their owner in the UI, and viewed in a full-screen photo viewer when a real photo exists. The live site is published on GitHub Pages and can still open offline on a device after that device has loaded it once online.

New photo uploads now go directly to Cloudinary from the browser. Supabase still stores the pin data, but Cloudinary handles the image file itself.

On iPhone, where the in-page Photos picker can stall, an iOS Shortcut handles photos instead: it uploads the selected photo to Cloudinary and opens the app at `?photo=<secure_url>`. The app reads that query param and pre-fills the "Drop a Crumb" form. The Shortcut install link lives in `index.html`.

## Live Site

```text
https://beatbop420.github.io/breadcrumbs/
```

## Install

```bash
cd /home/petra/Desktop/breadcrumbs
npm install
```

## Run

```bash
cd /home/petra/Desktop/breadcrumbs
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000
```

For the public live site, open the GitHub Pages URL above.

## Tests

```bash
cd /home/petra/Desktop/breadcrumbs
npm test
npm run check:syntax
npm run lint
npm run security:check
npm run audit:deps
```

## Deploy

This project is deployed as a static site on GitHub Pages.

> **Before every deploy that touches app code:** bump `CACHE_NAME` in `sw.js` (e.g. `breadcrumbs-v12` -> `breadcrumbs-v13`). The service worker is cache-first and only re-downloads assets when this version string changes. Skip this and phones keep serving the old cached code even after a successful push.

1. Create a Cloudinary account.
2. Create an unsigned upload preset for this project.
3. Put the Cloudinary values into `window.BREADCRUMBS_CONFIG` in `index.html` or `js/config.local.js`.
4. Push the repo to GitHub.
5. In the GitHub repo settings, open `Pages`.
6. Set the source to the `master` branch root.
7. Save the setting.
8. Wait for GitHub Pages to publish the site.

## Environment Variables

Breadcrumbs does not use shell environment variables for runtime configuration. The public runtime config is embedded in `index.html` for GitHub Pages, and local development can still use `js/config.local.js` if needed.

| Name | Purpose | Required | Default |
|---|---|---|---|
| `window.BREADCRUMBS_CONFIG.supabaseUrl` | Supabase project URL | Yes, at runtime | None |
| `window.BREADCRUMBS_CONFIG.supabaseAnonKey` | Supabase anonymous public key | Yes, at runtime | None |
| `window.BREADCRUMBS_CONFIG.cloudinaryCloudName` | Cloudinary cloud name for direct uploads and image URLs | Yes, for new photo uploads | Empty string |
| `window.BREADCRUMBS_CONFIG.cloudinaryUploadPreset` | Cloudinary unsigned upload preset | Yes, for new photo uploads | Empty string |

For local testing, the same values can be provided in `js/config.local.js`.

## Key files (for code review)

| File | What it is |
|---|---|
| `index.html` | App shell — config, map mount point, form HTML, service worker registration. |
| `js/app.js` | Entry point. Wires everything together on load. |
| `js/map.js` | Leaflet map setup, marker management, click-to-drop-pin flow. |
| `js/ui.js` | All UI rendering — pin cards, photo viewer, form state, toasts, crow animation. |
| `js/data.js` | All Supabase reads and writes. The data access layer. |
| `js/pinLogic.js` | Business rules — ownership checks, pin validation, legacy pin handling. |
| `js/photoProcessing.js` | Cloudinary direct upload, EXIF stripping, file validation. |
| `js/supabase.js` | Supabase client init. |
| `js/username.js` | Name-based identity (no auth — trust-based for family use). |
| `js/offlineCache.js` | Caches pins to localStorage for offline viewing. |
| `js/config.js` | Runtime config shape + defaults. |
| `sw.js` | Service worker for offline/PWA. Cache-first. **Bump `CACHE_NAME` on every code change or phones serve stale code.** |
| `css/style.css` | All styles. |
| `sql/` | Supabase schema + RLS policies. |

---

## Known Limitations

- Ownership is name-based and trust-based, which is fine for a small family group but not for hostile users.
- The typed place name can move the temporary marker through best-effort geocoding. It is not guaranteed and depends on network availability.
- The public site needs one online load on a device before offline caching is useful on that device.
- Cloudinary cleanup is not wired yet, so failed saves, later pin deletes, or photo replacements may leave unused remote files behind.
- Legacy pins are not verifiable in the live database right now because there are no `is_legacy = true` rows present.
- Android Chrome installability was not fully verified from this laptop/Firefox workflow.
