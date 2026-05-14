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
| Backend services | Supabase auth, database, storage, realtime |
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
- Supabase storage bucket `pins`
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
- Pins are loaded after the splash button is pressed, not behind the splash.
- Offline behavior relies on both service-worker caching and `localStorage` pin caching.

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
| Field | Type | Constraints | Validation |
|-------|------|-------------|------------|
| `name` | `text` | PK, unique, NOT NULL | Non-empty, max 100 chars |
| `created_at` | `timestamptz` | Default `now()` | Auto, never sent from client |

### `pins` Table
| Field | Type | Constraints | Validation |
|-------|------|-------------|------------|
| `id` | `uuid` | PK, `gen_random_uuid()` | Auto, never sent from client |
| `created_at` | `timestamptz` | Default `now()` | Auto, never sent from client |
| `place_name` | `text` | NOT NULL | Non-empty, max 200 chars |
| `note` | `text` | Nullable | Max 1000 chars |
| `submitted_by` | `text` | Nullable | Max 100 chars |
| `owner_name` | `text` | NOT NULL | Unique-name account that owns the pin |
| `lat` | `double precision` | Nullable | -90 to 90 |
| `lng` | `double precision` | Nullable | -180 to 180 |
| `image_path` | `text` | Nullable | Valid storage path or null |
| `is_legacy` | `boolean` | Default `false` | Never set by user — set manually |

### `views` Table
| Field | Type | Constraints |
|-------|------|-------------|
| `id` | `uuid` | PK, auto |
| `created_at` | `timestamptz` | Auto |
| `username` | `text` | NOT NULL, max 100 chars |
| `pin_id` | `uuid` | FK → `pins.id`, CASCADE delete |

**Unique constraint:** one row per `username` + `pin_id` combination.

### Client-Side Pin Shape
```javascript
{
  id:           string,   // uuid
  created_at:   string,   // ISO timestamp
  place_name:   string,
  note:         string | null,
  submitted_by: string | null,
  owner_name:   string,
  lat:          number,
  lng:          number,
  image_path:   string | null,
  is_legacy:    boolean
}
```

### Local Storage
```javascript
// Key: "breadcrumbs_username"
// Value: plain string for the current active name account
"Sofia"
```

---

## 4. API CONTRACT

All data operations go through the Supabase JS client.

| Operation | Supabase Call | Auth Required | Notes |
|-----------|--------------|---------------|-------|
| Create/reuse name account | `SELECT/INSERT accounts` as needed | None | Name is the lightweight account identity |
| Load all pins | `SELECT * FROM pins` | Anon or authenticated session | Anonymous auth sessions resolve to `authenticated`, so the read policy must allow both |
| Insert pin | `INSERT INTO pins (...)` | Anon session | Validated client-side first; no returned-row select on write |
| Upload photo | `storage.upload('pins', path, file)` | Anon session | jpeg/png/webp, max 5MB |
| Delete uploaded photo | `storage.remove([path])` | Anon session | Called only after upload success + insert failure |
| Delete pin photo during confirmed delete | `storage.remove([path])` | Anon session | Called during owner-confirmed delete flow |
| Delete pin | `DELETE FROM pins WHERE id = ? AND owner_name = ?` | Anon session | Allowed only for owner under RLS/policy rules |
| Get photo URL | `storage.getPublicUrl('pins', path)` | None (public bucket) | Constructed client-side |
| Load seen pins | `SELECT pin_id FROM views WHERE username = ?` | Anon (RLS: public read) | Called on init |
| Mark pin seen | `INSERT INTO views (username, pin_id)` | Anon session | Duplicate silently ignored |
| Realtime sub | `channel.on('postgres_changes', ...)` | Anon (RLS: public read) | INSERT events on `pins` only |
| Anon sign-in | `auth.signInAnonymously()` | None | Called before first insert only |

### User-Facing Error Messages
| Scenario | Message Shown |
|----------|--------------|
| Insert fails before any upload | "Couldn't save your memory. Please tap Save Memory again." |
| Upload fails | "Photo upload failed. Please choose the photo again and try once more." |
| Insert fails after successful upload | "Couldn't save your memory. Please choose the photo again and tap Save Memory again." |
| Delete confirmation | "Are you sure? This permanently deletes this memory." |
| Delete succeeds | "Memory deleted." |
| Delete fails | "Couldn't delete this memory. Please try again." |
| File too large | "Photo must be under 5MB." |
| Wrong file type | "Only JPG, PNG, or WebP photos are allowed." |
| Network offline | "You're offline. Your memory wasn't saved." |
| Auth fails | "Something went wrong. Please refresh and try again." |

Retryable Add Pin submit failures are shown inline inside the Add Pin modal so the user can correct or resubmit without losing context.

---

## 5. SECURITY MODEL

### Authentication
- **Mechanism:** Supabase Anonymous Auth (`signInAnonymously()`)
- **When called:** Only at pin submission time — not on page load
- **Username:** Stored in localStorage only — not tied to auth identity
- **No PII collected:** No email, name, or device ID tied to auth session
- **Role note:** Anonymous auth sessions are evaluated by Supabase as the `authenticated` role

### Authorization
- **Enforced by:** Supabase RLS policies (server-side)
- **Read pins:** Anyone
- **Insert pins:** Anon session + RLS field validation
- **Delete pins:** Only when current active name matches the pin owner and policy allows it
- **Read views:** Anyone
- **Insert views:** Anon session, username length validated
- **Update:** No policies

### Input Validation
| Field | Client Rule | Server Rule |
|-------|-------------|-------------|
| `place_name` | Non-empty, max 200 chars | NOT NULL, length > 0 |
| `note` | Max 1000 chars | length ≤ 1000 |
| `submitted_by` | Max 100 chars | length ≤ 100 |
| `owner_name` | Non-empty unique name account | required, uniqueness/account rules as defined |
| `lat` | Number, -90 to 90 | between -90 and 90 |
| `lng` | Number, -180 to 180 | between -180 and 180 |
| `file` | jpeg/png/webp, max 5MB | Enforced at Storage bucket level |
| `username` | Non-empty, max 100 chars | length > 0, length ≤ 100 |

### Secrets Management
- **Anon public key:** Stored in runtime config (`js/config.local.js` for local verification). Safe for frontend exposure; RLS is the security layer.
- **Service role key:** Never in any file. Stays in Supabase dashboard only.

### Encryption
- **In transit:** HTTPS enforced by GitHub Pages + Supabase (TLS 1.2+)
- **At rest:** Supabase encrypts data at rest by default (AES-256)

### OWASP Top 10
| # | Category | Mitigation |
|---|----------|-----------|
| 1 | Broken Access Control | RLS must enforce owner-only delete. No unrestricted update/delete allowed. |
| 2 | Cryptographic Failures | All traffic HTTPS. No sensitive data client-side. Anon key is not a secret. |
| 3 | Injection | Supabase JS uses parameterized queries. No raw SQL from frontend. |
| 4 | Insecure Design | No admin functions. Delete is owner-only and permanently confirmed. No general update flow. |
| 5 | Security Misconfiguration | Public bucket intentional. Service role key never exposed. RLS enabled. |
| 6 | Vulnerable and Outdated Components | CDN libraries pinned to exact versions. Documented for auditing. |
| 7 | Identification and Authentication Failures | Anonymous auth only. No passwords. No brute force surface. |
| 8 | Software and Data Integrity Failures | HTTPS CDN. No `eval()` or `innerHTML` with user content. |
| 9 | Security Logging and Monitoring Failures | Supabase built-in audit logs. Client errors to console only. |
| 10 | SSRF | Not applicable — static frontend. No server-side HTTP requests. |

---

## 6. TESTING STRATEGY

### Test Runner
- **Tool:** Custom minimal test runner (`js/test-runner.js`) — vanilla JS, no dependencies
- **Execution:** `node --input-type=module` via terminal (Node.js used for testing only, not for the app)
- **Format:** `expect(testName, actualValue, expectedValue)` — logs PASS/FAIL per test, summary at end

### Test Status
| File | Tests | Status |
|------|-------|--------|
| `js/config.test.js` | 11 | Passed |
| `js/data.test.js` | 46 | Passed |
| `js/map.test.js` | 8 | Passed |
| `js/pinLogic.test.js` | 42 | Passed |
| `js/supabase.test.js` | 26 | Passed |
| `js/ui.test.js` | 10 | Passed |
| `js/username.test.js` | 8 | Passed |

**Latest automated test summary:** 151 total tests, 151 passed, 0 failed, 0 skipped.

### Test Coverage Plan
| Type | Method | Coverage |
|------|--------|----------|
| Unit (automated) | `node` via terminal | All validation + sanitization functions in `data.js` |
| Unit (automated) | `node` via terminal | All business logic functions as each layer is built |
| Manual functional | Step through each user flow in browser | 100% of F1–F27 |
| Mobile layout | Real iOS Safari + Android Chrome | All modals, touch targets, camera roll |
| Realtime | Two browser tabs; add pin in one | F10 |
| Offline/PWA | Add to home screen; disable network; reopen | F12 |
| Validation | Empty form, over-length inputs, wrong file type | F5 |
| Username flow | First visit prompt, auto-fill, seen/unseen sync | F13 + username |
| Error states | Simulate network failure during submit | Toast messages |
| Submit failure recovery | Simulate upload failure and insert failure | F15–F17, manual resubmit flow, orphan cleanup |
| Ownership and delete | Simulate owner delete, non-owner delete, and legacy-pin delete | F18–F27 |

**Outstanding manual QA note:** the major live blockers have been manually exercised and fixed. Broader regression is still recommended for second-device realtime, mobile PWA behavior, and delete of a pin with a real uploaded photo.

**Not tested:** Browser E2E automation, load testing (small audience), IE/old browsers.

---

## 7. ERROR HANDLING STRATEGY

- All async Supabase calls wrapped in `try/catch`
- Raw error objects never shown to users
- User sees plain English via `showToast()` for global failures and inline modal errors for retryable Add Pin submit failures
- Errors logged to `console.error()` with `[Breadcrumbs]` prefix
- Photo upload fails: no auto-retry; modal stays open; text fields remain; photo input cleared
- Pin insert fails after photo upload: delete uploaded photo, then keep modal open and require manual resubmit
- Pin delete fails: pin remains visible, destructive action is not partially reported as successful, and the user sees a clear failure message
- Realtime disconnect: Supabase client handles reconnection automatically
- Offline submit: detect before calling Supabase, show toast immediately

**Never exposed in errors:** Supabase error codes, stack traces, schema field names, bucket names, internal architecture details.

---

## 8. LOGGING STRATEGY

| Level | What | Example |
|-------|------|---------|
| `console.error` | Failed Supabase calls, auth failures, upload errors | `[Breadcrumbs] insertPin failed: <error>` |
| `console.error` | Cleanup failure after partial submit | `[Breadcrumbs] deletePhoto after insert failure failed: <error>` |
| `console.warn` | Validation blocked submission, realtime disconnect | `[Breadcrumbs] validation failed: place_name empty` |
| `console.info` | App init, map ready, pins loaded, realtime connected | `[Breadcrumbs] loaded 34 pins` |
| `console.debug` | Pin render, seen/unseen state, modal open/close | Commented out in production |

**Never logged:** Anon key, user-submitted text, file contents, auth tokens, raw Supabase error responses.
