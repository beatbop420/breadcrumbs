# Breadcrumbs — Security Review
**Date:** 2026-05-13
**Status:** COMPLETE WITH ACCEPTED WAIVERS

## Security Summary

`breadcrumbs` is secure enough for its stated use as a tiny trusted family scrapbook, but it is not designed for hostile or public users.

The main reason is architectural:
- identity is just a saved name
- server-side delete policies are broader than the UI suggests
- strong ownership is therefore trust-based, not cryptographically enforced

## Security Checklist

| Check | Status | Evidence | Note |
|---|---|---|---|
| Client-side validation exists for user inputs | Pass | [data.js](/home/petra/Desktop/breadcrumbs/js/data.js:34) | Names, notes, coordinates, MIME type, and size are checked |
| User content is rendered safely | Pass | [pinLogic.js](/home/petra/Desktop/breadcrumbs/js/pinLogic.js:73), [ui.js](/home/petra/Desktop/breadcrumbs/js/ui.js:29) | Escaped or written via `textContent` |
| Auth session enforced before protected writes | Pass | [supabase.js](/home/petra/Desktop/breadcrumbs/js/supabase.js:26), [app.js](/home/petra/Desktop/breadcrumbs/js/app.js:131), [app.js](/home/petra/Desktop/breadcrumbs/js/app.js:165), [app.js](/home/petra/Desktop/breadcrumbs/js/app.js:216), [app.js](/home/petra/Desktop/breadcrumbs/js/app.js:327) | Insert, upload, edit, delete, and seen-pin write paths all ensure a session |
| Photo size and MIME are enforced in code and storage config | Pass | [data.js](/home/petra/Desktop/breadcrumbs/js/data.js:67), [2026-05-11-delete-and-storage-fixes.sql](/home/petra/Desktop/breadcrumbs/sql/2026-05-11-delete-and-storage-fixes.sql:23) | 5 MB max, JPG/PNG/WebP only |
| Failed upload/update flows clean up temporary files | Pass | [app.js](/home/petra/Desktop/breadcrumbs/js/app.js:123), [app.js](/home/petra/Desktop/breadcrumbs/js/app.js:216), [app.test.js](/home/petra/Desktop/breadcrumbs/js/app.test.js:15) | Prevents orphaned replacement files |
| Public runtime config rejects placeholders | Pass | [config.js](/home/petra/Desktop/breadcrumbs/js/config.js:39) | Blank or placeholder config fails fast |
| Public frontend does not contain a service-role key | Pass | [index.html](/home/petra/Desktop/breadcrumbs/index.html:135) | Only the anon key is embedded |
| Dependencies are pinned and current audit is clean | Pass | [package.json](/home/petra/Desktop/breadcrumbs/package.json:5) | `npm audit --audit-level=high` returned `found 0 vulnerabilities` |
| Local cache stores only low-sensitivity app state | Pass | [username.js](/home/petra/Desktop/breadcrumbs/js/username.js:5), [offlineCache.js](/home/petra/Desktop/breadcrumbs/js/offlineCache.js:1) | Saved username, cached pins, and seen-pin ids |
| User-facing errors avoid exposing backend internals | Pass | [app.js](/home/petra/Desktop/breadcrumbs/js/app.js:159), [app.js](/home/petra/Desktop/breadcrumbs/js/app.js:294), [ui.js](/home/petra/Desktop/breadcrumbs/js/ui.js:354) | UI messages stay generic |
| Server-side owner authorization is strict | Waived | [pinLogic.js](/home/petra/Desktop/breadcrumbs/js/pinLogic.js:53), [2026-05-11-delete-and-storage-fixes.sql](/home/petra/Desktop/breadcrumbs/sql/2026-05-11-delete-and-storage-fixes.sql:15), [2026-05-11-delete-and-storage-fixes.sql](/home/petra/Desktop/breadcrumbs/sql/2026-05-11-delete-and-storage-fixes.sql:86) | UI checks ownership, but live delete policies are broad |
| Saved-name identity is strongly bound to a real person | Waived | [username.js](/home/petra/Desktop/breadcrumbs/js/username.js:9), [2026-05-11-name-ownership-delete.sql](/home/petra/Desktop/breadcrumbs/sql/2026-05-11-name-ownership-delete.sql:19) | Identity is plain-text name reuse, not strong auth |
| Console logs hide backend details from a technical user | Waived | [app.js](/home/petra/Desktop/breadcrumbs/js/app.js:153), [app.js](/home/petra/Desktop/breadcrumbs/js/app.js:292), [config.js](/home/petra/Desktop/breadcrumbs/js/config.js:21) | Debug logging is still visible in browser devtools |

## Accepted Waivers

Accepted for current use:
- trust-based identity
- broad server-side delete/storage policies
- console-visible debug details

Why waived:
- the app is intended for a very small known family group
- the current product intentionally avoids passwords and heavy auth

Not acceptable without redesign:
- hostile users
- wider public rollout
- any use case where real owner-only enforcement matters

## Plain-English Conclusion

For five trusted family members: acceptable.

For strangers or determined bad actors: not acceptable.
