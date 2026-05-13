# Breadcrumbs — Verification Report
**Date:** 2026-05-12
**Status:** PHASE 3 COMPLETE WITH EXCEPTIONS — verification work is finished for the current build. Core behavior is verified. Remaining issues are explicit requirement exceptions, not unknown bugs.

## 1. Automated Verification

### `npm test`
- Result: pass
- Summary: `197 passed, 0 failed`

### `npm run check:syntax`
- Result: pass
- Summary: `Checked_files: 23`, `Failures: 0`

### `npm run security:check`
- Result: pass
- Summary: `Security checks passed. No forbidden patterns found.`

### `npm run lint`
- Result: pass

---

## 2. Manual Verification — Confirmed Working

- App loads and the splash flow works.
- Existing pins load after `Start Exploring`.
- New pin save succeeds.
- New pin appears in the correct clicked location.
- New pins appear in other open tabs without refresh after enabling Realtime publication.
- Viewed pins change from unseen color to seen color.
- Blank place name validation blocks submit.
- Failed submit does not auto-retry.
- Failed submit keeps the modal open, keeps typed text, keeps the temporary marker, clears the photo input, and shows an error.
- Upload-success / insert-fail cleanup works with no orphan file left in Storage.
- Delete works for owned pins.
- Delete with a photo works in normal use.
- Non-owners do not get a working delete control.
- Ownership checks now work across `Petra` / `petra`.
- No-photo pins show the placeholder image.
- Selecting a photo shows selected-state feedback and inline preview before save.
- Saved photos open full-screen and show the full image instead of cropping it.
- Offline refresh now works for already-loaded pins, and the splash button still works offline.
- The map now keeps the wrapped drag behavior without showing the repeat sliver at max zoom-out.

---

## 3. Verified Product Behavior

- Typed place name does not control map location.
- Pin location is determined only by the map click coordinates.
- The active saved name is shown on-screen and is the identity used for ownership checks.
- Pins load after the splash is dismissed, not during the splash itself.

---

## 4. Root Causes Found and Fixed During Verification

| Symptom | Root Cause | Fix |
|---------|------------|-----|
| Insert hit RLS | The client requested the inserted row back, which triggered a read-path RLS failure | Insert now uses a plain insert without `.select().single()` |
| Pins disappeared after sign-in | Anonymous sessions use the `authenticated` role, but the read policy only allowed `anon` | Read policy updated to allow `anon, authenticated` |
| New pin appeared in the wrong place until zoom | Animation overwrote Leaflet's wrapper transform | Animation moved to the inner marker element |
| Photo upload failed | Storage bucket and policies were missing | Bucket and storage policies were created |
| Delete failed | Delete/storage policies were missing | Delete/storage SQL added and applied |
| Realtime did not work | `pins` was not in the Supabase Realtime publication | Publication SQL added and applied |
| Offline refresh failed | Startup died before the splash button could work offline, and loaded pins were not cached locally | Added offline pin cache and offline-safe startup flow |
| Owner checks split `Petra` vs `petra` | Identity matching was case-sensitive | Ownership/account matching made case-insensitive |
| Map showed repeat sliver at max zoom-out | Minimum zoom-out still exposed a tiny wrapped edge | Tightened world-fit padding and bumped service-worker cache |

---

## 5. Applied SQL During Verification

Applied or prepared SQL files:
- [2026-05-11-name-ownership-delete.sql](/home/petra/Desktop/breadcrumbs/sql/2026-05-11-name-ownership-delete.sql)
- [2026-05-11-pins-read-authenticated.sql](/home/petra/Desktop/breadcrumbs/sql/2026-05-11-pins-read-authenticated.sql)
- [2026-05-11-delete-and-storage-fixes.sql](/home/petra/Desktop/breadcrumbs/sql/2026-05-11-delete-and-storage-fixes.sql)
- [2026-05-12-enable-pins-realtime.sql](/home/petra/Desktop/breadcrumbs/sql/2026-05-12-enable-pins-realtime.sql)

---

## 6. Remaining Exceptions

These are the remaining requirement exceptions after Phase 3 closeout:

- `F11`, `F22`, `A14`: true legacy-pin behavior is not fully verifiable right now because the live database currently has no rows with `is_legacy = true`.
- `F12` install / Add to Home Screen: offline behavior is verified, but Android Chrome installability was not tested from this laptop/Firefox workflow.
- `N2`: iOS Safari and Android Chrome were not fully re-tested end to end.
- `N4`, `C4`: GitHub Pages hosting is not deployed yet.
- `N8`: the app does not load pins behind the splash; current real behavior is that pins load after `Start Exploring`, and that behavior was accepted during verification.
- `C1`, `N3`: the shipped app is still runtime-simple, but the repo now contains Node/npm-based verification tooling, so the original “zero build tools / no Node.js” wording is no longer literally true for the repository.
- `F1` / tech stack wording: the app uses Carto Voyager tiles over Leaflet, not plain OpenStreetMap tiles alone.
- `F4`: the name field is still shown in the Add Pin modal, but it is now locked/read-only and tied to the active saved identity.

---

## 7. Verification Conclusion

Phase 3 is complete.

Blunt version:
- the app itself is working
- the main live bugs were fixed
- automated checks are clean
- the remaining items are known exceptions, deployment work, or environment-limited checks

Phase 4 Security Review has **not** started.
