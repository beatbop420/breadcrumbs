# Breadcrumbs — Final Review
**Date:** 2026-05-28
**Status:** COMPLETE WITH ACTIVE IPHONE LIBRARY FOLLOW-UP

## 1. Scope Check

Completed across the review and follow-up cleanup:
- current repo state reviewed
- automated verification executed and rerun locally
- edit-flow defects fixed and regression-covered
- iPhone photo upload behavior cleaned up without undoing the earlier working picker fixes
- photo upload path moved to Cloudinary direct browser uploads
- closeout documents refreshed so they no longer describe the old pre-save or pre-Cloudinary state

## 2. What Changed

- Latest pushed photo-investigation code milestone is `5df3b52` (`Simplify photo input accept list to unblock iPhone library selection`).
- New photo uploads go directly to Cloudinary. Supabase still stores pin data; legacy Supabase Storage photo paths remain supported for read/restore/delete compatibility.
- Cloudinary display now prefers the returned `secureUrl`, service-worker uploads bypass cache handling, HEIC/HEIF normalization has a timeout, and upload diagnostics show selected file type/size/stage once the app receives a file.
- Confirmed working: computer browser upload and iPhone camera capture from Breadcrumbs.
- Still unresolved: iPhone existing-library selection can stall in the native Photos picker before Breadcrumbs receives a file, so diagnostics do not appear.
- The old Edge Function upload attempt was removed; it is not the active upload path.

## 3. Verification Snapshot

- `npm test`: 255 passed, 0 failed
- `npm run check:syntax`: 26 files checked, 0 failures
- `npm run lint`: passed
- `npm run security:check`: passed
- `npm audit --audit-level=high`: 0 vulnerabilities

## 4. Remaining Caution

- The trust model is still intentionally weak for trusted-family use.
- The broader server-side delete/storage policy model is still an accepted waiver.
- Cloudinary unsigned uploads are intentionally public-client uploads; keep the preset scoped to this app.
- Real iPhone and Android device checks are still worth doing against the live GitHub Pages URL.
- iPhone existing-library selection is a known active follow-up because the native picker can stall before the app receives a file.

## 5. Final Conclusion

The review and follow-up cleanup are complete, and the Cloudinary upload path is already configured in the app.

What remains outside this closeout:
- fix or route around iPhone existing-library photo selection stalling before the web page receives a file
- test Android Chrome photo upload separately
- remove temporary upload diagnostics after the iPhone library issue is understood

---

## Update — 2026-05-30

- The iPhone existing-library photo problem is **resolved** via an iOS Shortcut bridge: the Shortcut uploads the photo to Cloudinary and opens the app at `?photo=<secure_url>`, which pre-fills the form. Confirmed working end-to-end. Commit `805dd5a`.
- Root cause of the "shortcut does nothing" symptom was **not** code — the feature was deployed correctly. The cache-first service worker still held `CACHE_NAME = breadcrumbs-v11` and kept serving the stale pre-feature `js/app.js` to phones. Bumped to `breadcrumbs-v12` (commit `de0ca31`) to force a fresh restock, and added `js/photoProcessing.js` to the precache list.
- New standing rule: bump `CACHE_NAME` in `sw.js` on every app-code change.
- Still open: Cloudinary cleanup, Android Chrome upload test, removal of temporary upload diagnostics.
