# Breadcrumbs — Verification Report
**Date:** 2026-05-11
**Status:** PARTIAL COMPLETE ✅ — major live blockers resolved, targeted manual verification completed, broader regression still optional.

## 1. Automated Verification

### `npm test`
- Result: pass
- Summary: `151 passed, 0 failed`

### `npm run check:syntax`
- Result: pass
- Summary: `Checked_files: 21`, `Failures: 0`

### `npm run security:check`
- Result: pass
- Summary: `Security checks passed. No forbidden patterns found.`

### `npm run lint`
- Result: pass

---

## 2. Manual Verification Findings

### Confirmed Working
- Existing pins show again after fixing the `pins` read policy.
- New pin save succeeds.
- New pin appears at the correct clicked location after fixing the marker animation.
- Delete works after applying the delete/storage SQL.
- Photo upload works after creating/configuring the storage bucket and policies.
- Empty place name validation shows an error.

### Confirmed Product Behavior
- Typed place name does not control map location.
- Pin location is determined only by the map click coordinates.

### UX Improvements Implemented After Manual Feedback
- Add modal now shows photo-selected status and inline preview before save.
- View modal now uses contain-fit photo display.
- Clicking a saved photo opens a full-screen lightbox.

### Manual Re-test Still Recommended
- Confirm the new photo preview/lightbox behavior in the browser after hard refresh.
- Confirm delete of a pin with a real uploaded photo removes the storage object.
- Confirm realtime appearance of a new pin on a second open device or tab.

---

## 3. Root Causes Discovered During Verification

| Symptom | Root Cause |
|---------|------------|
| Insert hit RLS | The client requested the inserted row back, which caused a read-path RLS failure |
| Pins disappeared after sign-in | Anonymous auth sessions use the `authenticated` role, but the read policy only allowed `anon` |
| New pin appeared in the wrong place until zoom | Animation overwrote Leaflet's transform on the marker wrapper |
| Photo upload failed | Storage bucket did not exist |
| Delete failed | Required delete/storage policies were missing |

---

## 4. Applied Live SQL Fixes

Applied or prepared SQL files:
- [2026-05-11-name-ownership-delete.sql](/home/petra/Desktop/breadcrumbs/sql/2026-05-11-name-ownership-delete.sql)
- [2026-05-11-pins-read-authenticated.sql](/home/petra/Desktop/breadcrumbs/sql/2026-05-11-pins-read-authenticated.sql)
- [2026-05-11-delete-and-storage-fixes.sql](/home/petra/Desktop/breadcrumbs/sql/2026-05-11-delete-and-storage-fixes.sql)

---

## 5. Verification Conclusion

The original blocking issues found during live manual testing are resolved. The app is now in a state where remaining work is normal regression and product polish, not core functionality triage.
