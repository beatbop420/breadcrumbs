# Breadcrumbs — Architecture Document
**Date:** 2026-05-13
**Status:** APPROVED

## 1. Purpose

This document describes the current `breadcrumbs` codebase as it actually exists in the repository and records the verification plan used for this review cycle.

## 2. Current System Summary

`breadcrumbs` is a static single-page web app for saving family memories on a world map.

Current implemented behavior:
- splash screen appears first
- user enters or reuses a name
- map loads after the splash is dismissed
- user can add a pin with note and optional photo
- typed place names can trigger best-effort geocoding that moves the temporary marker
- saved pins can be viewed, marked seen, edited by the owner, and deleted by the owner in the UI
- existing pins can be cached locally for offline reuse after a prior online load

## 3. Runtime Stack

| Layer | Technology |
|---|---|
| App shell | HTML5 |
| Styling | CSS3 |
| Frontend logic | Vanilla JavaScript ES modules |
| Map | Leaflet 1.9.4 |
| Tile source | Carto Voyager raster tiles |
| Backend client | Supabase JS 2.49.1 via CDN |
| Backend services | Supabase auth, database, legacy storage compatibility, realtime |
| New photo storage | Cloudinary direct browser uploads |
| Hosting | GitHub Pages |
| Offline support | Service Worker + `localStorage` cache |
| Local verification tooling | Node.js scripts + ESLint |

## 4. Main Modules

| File | Responsibility |
|---|---|
| [index.html](/home/petra/Desktop/breadcrumbs/index.html:1) | App shell, DOM structure, CDN imports, inline public runtime config, service-worker registration |
| [js/app.js](/home/petra/Desktop/breadcrumbs/js/app.js:1) | Startup orchestration, username flow, geocoding, add/view/edit/delete flows, offline fallback, realtime |
| [js/ui.js](/home/petra/Desktop/breadcrumbs/js/ui.js:1) | Splash, username prompt, add/view modals, photo preview, lightbox, toast, counters |
| [js/map.js](/home/petra/Desktop/breadcrumbs/js/map.js:1) | Leaflet setup, markers, temporary marker, map animations |
| [js/data.js](/home/petra/Desktop/breadcrumbs/js/data.js:1) | Validation and sanitization rules |
| [js/pinLogic.js](/home/petra/Desktop/breadcrumbs/js/pinLogic.js:1) | Owner checks, safe display shaping, storage paths, photo URLs, pin colors |
| [js/supabase.js](/home/petra/Desktop/breadcrumbs/js/supabase.js:1) | Supabase auth, queries, storage actions, realtime subscription |
| [js/offlineCache.js](/home/petra/Desktop/breadcrumbs/js/offlineCache.js:1) | Cached pins and seen-pin storage |
| [js/username.js](/home/petra/Desktop/breadcrumbs/js/username.js:1) | Saved-name persistence |
| [sw.js](/home/petra/Desktop/breadcrumbs/sw.js:1) | Static asset caching and network/cache strategy |

## 5. Data And Trust Boundaries

Browser-local state:
- saved username
- cached pins
- cached seen-pin ids
- optional stored runtime config for testing

Remote dependencies:
- Supabase database
- Supabase storage bucket `pins` for legacy photo compatibility
- Cloudinary for new photo uploads and optimized photo URLs
- Supabase anonymous auth
- Supabase realtime
- Carto map tiles
- Nominatim geocoding
- CDN-hosted Leaflet and Supabase JS

Trust model:
- identity is based on a saved plain-text name
- this is acceptable only for a tiny trusted family group
- it is not strong hostile-user security

## 6. Current Behavior Notes That Matter For Verification

- Typed place names are not just labels anymore; geocoding in [app.js](/home/petra/Desktop/breadcrumbs/js/app.js:14) can move the temporary marker.
- Edit support exists in the current UI and backend flow through [index.html](/home/petra/Desktop/breadcrumbs/index.html:118), [app.js](/home/petra/Desktop/breadcrumbs/js/app.js:266), and [supabase.js](/home/petra/Desktop/breadcrumbs/js/supabase.js:134).
- New photo uploads use Cloudinary from [supabase.js](/home/petra/Desktop/breadcrumbs/js/supabase.js:96); Supabase stores the resulting structured image reference with the pin.
- Cloudinary display prefers the returned `secureUrl` for cross-device compatibility; generated Cloudinary URLs are only a fallback.
- Upload diagnostics report file name, MIME type, size, and stage after the file input emits a `change` event.
- Pins are loaded after the splash button is pressed, not behind the splash.
- Offline behavior relies on both service-worker caching and `localStorage` pin caching.
- iPhone photos can also arrive via an iOS Shortcut that uploads to Cloudinary and opens the app at `?photo=<secure_url>`; [app.js](/home/petra/Desktop/breadcrumbs/js/app.js:428) reads that param into `prefillPhotoUrl` and [ui.js](/home/petra/Desktop/breadcrumbs/js/ui.js:227) renders it via `setAddPhotoPreviewFromUrl`.

## 7. Verification Plan Used In This Review

Automated checks:
- `npm test`
- `node scripts/check-syntax.js`
- `npm run lint`
- `node scripts/security-check.js`
- `npm audit --audit-level=high`

High-risk review targets:
- photo upload and cleanup paths
- edit flow consistency
- owner-only actions versus server-side policy reality
- offline cache behavior
- document/code drift

## 8. Review Outcome Summary

The architecture review found two meaningful code/document drift areas before verification closed:
- edit support existed even though older docs still described “no frontend update”
- typed place names could move the temporary marker even though older docs still described them as label-only

Those drifts were accounted for in later phase documents and supporting docs were updated.

## 9. Known Constraints And Follow-Up

- The identity model is still name-based and trust-based. That is acceptable only for a small trusted family group.
- The server-side delete and storage policy model remains broader than the UI wording implies. That is an accepted Phase 4 waiver, not an accidental mismatch.
- `manifest.json` and `sw.js` are intentionally coupled to the GitHub Pages `/breadcrumbs/` path.
- `sw.js` is cache-first, so `CACHE_NAME` MUST be bumped on every app-code change. If it is not, deployed phones keep serving stale cached assets even after a successful push. (This caused a multi-session false "iOS shortcut is broken" investigation that was really just a stale v11 cache; resolved by bumping to v12 on 2026-05-30.)
- iPhone photo picking depends on these implementation choices that should not be casually reverted without real-device testing:
  - nested `<label>` + `<input type="file">` activation
  - a 1px visually hidden input instead of `display: none`
  - photo normalization for HEIC/HEIF before upload where browser support allows it, with timeout fallback
  - Cloudinary direct upload for new photos
- Known active issue: iPhone existing-library selection can stall in the native Photos picker before Breadcrumbs receives a file; iPhone camera capture from inside Breadcrumbs works.
- The old `supabase/functions/upload-photo` Edge Function draft was removed; it is not part of the current deployed upload flow.

## 10. Manual QA Still Worth Running

- iPhone Safari: pick from library, take a camera photo, and replace a photo during edit
- iPhone Safari: specifically verify whether existing-library selection reaches the app and shows upload diagnostics
- iPhone home-screen PWA: repeat the same photo flows after install
- Android Chrome: install, open, and add a photo
- Offline reopen after a prior successful online load
- Second-device realtime visibility
- Delete of a pin with a real uploaded photo
