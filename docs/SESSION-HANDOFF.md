# Breadcrumbs Session Handoff

Current live site:
- `https://beatbop420.github.io/breadcrumbs/`

Latest pushed commit:
- `de0ca31` - Bump SW cache to v12 so iOS gets the photo-shortcut code (2026-05-30)

Latest photo-feature commit:
- `805dd5a` - Add iOS Shortcuts bridge for iCloud photo uploads

Key supporting iPhone/photo commits already in history:
- `5df3b52` - Simplify photo input accept list to unblock iPhone library selection
- `1912e1b` - Allow iPhone HEIC library photo selection
- `e02be9a` - Show photo upload diagnostics
- `664c7d8` - Prevent iPhone photo normalization hangs
- `3dbcad3` - Bypass service worker cache for uploads
- `ddc52f1` - Prefer Cloudinary secure URLs for photos
- `393a8e8` - Use Cloudinary for photo uploads
- `262465c` - Fix iPhone library photo uploads
- `2c37483` - Fix iOS library photo upload — explicit accept types force HEIC→JPEG conversion
- `75de83e` - Fix iOS photo selection not registering after picker closes
- `61d99de` - Fix iOS photo upload — swap button for label, fix hidden input CSS

Current state:
- Phase 0 through Phase 5 review docs are complete locally.
- The app is deployed on GitHub Pages from the `master` branch root.
- New photo uploads go directly to Cloudinary from the browser.
- Supabase still stores pin data and supports legacy Supabase Storage photo paths.
- Cloudinary is already configured with cloud name `drijk2xzu` and upload preset `breadcrumbs_unsigned`.
- The inactive `supabase/` Edge Function draft and temp CLI files were removed.
- Computer browser photo upload works.
- iPhone camera capture from Breadcrumbs works.
- iPhone existing-library photo selection is now handled by an iOS Shortcut bridge (see below). The native in-page Photos picker on iPhone could still stall before the web page received a file, so the Shortcut works around it entirely.

iOS Shortcut photo bridge (WORKING as of 2026-05-30):
- The Shortcut (install link in `index.html`) does: Select Photos -> Get First Item -> POST to Cloudinary as multipart form field `file` + `upload_preset=breadcrumbs_unsigned` -> read `secure_url` -> open `https://beatbop420.github.io/breadcrumbs/?photo=<secure_url>`.
- On load, `js/app.js` reads the `photo` query param into `prefillPhotoUrl`, then strips it via `history.replaceState`.
- When the add modal opens, `setAddPhotoPreviewFromUrl(prefillPhotoUrl)` (in `js/ui.js`) shows the preview and status "Photo ready (uploaded via Shortcut)".
- On save, if no normal file was picked, the pin stores `buildCloudinaryImageReference({ secureUrl: prefillPhotoUrl })`.

What was last changed (2026-05-30):
- Bumped `CACHE_NAME` in `sw.js` from `breadcrumbs-v11` to `breadcrumbs-v12`. This was the actual cause of the "shortcut does nothing" symptom: the shortcut code was deployed, but the v11 service-worker cache (cache-first) kept serving the stale pre-feature `js/app.js` to phones. Bumping the version forces a fresh restock of all assets.
- Added the missing `js/photoProcessing.js` to the `sw.js` precache list.
- Shipped the real Shortcut install link in `index.html`.

CRITICAL OPERATIONAL RULE:
- Every time any app code changes, bump the `CACHE_NAME` version in `sw.js` line 1 (v12 -> v13 -> ...). The service worker is cache-first and only re-fetches assets when `CACHE_NAME` changes. Forgetting this makes phones serve stale code even after a successful push — this is exactly what caused the multi-session photo-shortcut confusion.

Next likely task:
- Wire Cloudinary cleanup so orphaned/replaced/deleted images are removed remotely.
- Test Android Chrome photo upload and PWA installability against the live URL.
- Consider removing the temporary in-app upload diagnostics now that the iPhone path is solved.

Notes:
- the trust-model/server-policy waiver remains accepted for trusted-family use
- the site may take a short time to refresh after future pushes because GitHub Pages rebuilds in the background
- after a push, phones pick up the new service-worker version on their next visit; a second visit guarantees the fresh code is active
