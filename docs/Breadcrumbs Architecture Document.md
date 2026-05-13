# Breadcrumbs — Architecture Document
**Version:** 1.7
**Date:** 2026-05-11
**Status:** APPROVED ✅ — updated to reflect the implemented app at Phase 3 closeout.

## 0. CURRENT STATE AND NEXT PHASE

**Current implementation state:** The app now supports working anonymous insert, authenticated reads, owner delete, public photo storage, add-photo preview, full-screen photo viewing, realtime inserts, offline cached pin viewing, and the final wrapped single-world map behavior. The major live blockers found during manual verification were fixed.

**Current phase status:** Phase 3 verification is complete.

**Next active phase:** None by default. Phase 4 Security Review is pending explicit approval.

---

## 1. TECHNOLOGY STACK

### Runtime & Language
| Layer | Technology | Version |
|-------|------------|---------|
| Markup | HTML | 5 |
| Styling | CSS | 3 |
| Logic | JavaScript | ES2020 (no transpilation) |
| Runtime | Browser-native | No Node.js |

### External Libraries (CDN, pinned versions)
| Library | Version | Purpose | CDN URL |
|---------|---------|---------|---------|
| Leaflet.js | 1.9.4 | Map rendering + interaction | `https://unpkg.com/leaflet@1.9.4/dist/leaflet.js` |
| Leaflet CSS | 1.9.4 | Map styles | `https://unpkg.com/leaflet@1.9.4/dist/leaflet.css` |
| Supabase JS | 2.49.1 | Database, auth, storage, realtime | `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/dist/umd/supabase.min.js` |
| Google Fonts | N/A | Playfair Display (headings), Inter (body) | `https://fonts.googleapis.com/css2?family=Playfair+Display&family=Inter` |

### Backend Services
| Service | Provider | Plan | Purpose |
|---------|----------|------|---------|
| Database | Supabase | Free | `pins` + `views` tables, RLS, Realtime |
| Storage | Supabase | Free | Photo uploads, public bucket `pins` |
| Auth | Supabase | Free | Anonymous sessions |
| Hosting | GitHub Pages | Free | Static file delivery |

### Tile Layer
- **Provider:** CartoDB Voyager
- **URL template:** `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png`
- **Attribution required:** CartoDB + OpenStreetMap contributors

---

## 2. MODULE STRUCTURE

### File Tree
```
/
├── package.json              — Local verification command definitions
├── package-lock.json         — Pinned verification-tool dependency lockfile
├── eslint.config.js          — Local lint configuration for verification
├── index.html               — App shell, loads all dependencies, defines DOM structure
├── manifest.json            — PWA metadata (name, icons, theme, display mode)
├── sw.js                    — Service Worker (caching strategy, offline support)
├── css/
│   └── style.css            — All visual styles (theme, layout, modals, animations)
├── js/
│   ├── data.js              — Data shapes, validation rules, sanitization ✅ BUILT + TESTED
│   ├── pinLogic.js          — Core pin logic, storage-path helpers, safe display shaping
│   ├── config.js            — Runtime Supabase config resolution
│   ├── config.local.js      — Local runtime Supabase config values for testing
│   ├── supabase.js          — Supabase service layer (auth, queries, storage, realtime)
│   ├── username.js          — localStorage name/account helper
│   ├── map.js               — Leaflet map adapter and marker behavior
│   ├── ui.js                — DOM UI adapter for modals, toast, splash, counters
│   ├── app.js               — App orchestration layer
│   ├── config.test.js       — Unit tests for runtime config handling
│   ├── data.test.js         — Unit tests for validation/sanitization logic
│   ├── map.test.js          — Unit tests for marker entrance animation behavior
│   ├── pinLogic.test.js     — Unit tests for core pin logic
│   ├── supabase.test.js     — Unit tests for Supabase service wrapper
│   ├── ui.test.js           — Unit tests for splash timing helpers
│   ├── username.test.js     — Unit tests for username persistence helpers
│   └── test-runner.js       — Minimal test runner (expect + summarizeResults)
├── scripts/
│   ├── run-tests.js         — Test suite launcher
│   ├── check-syntax.js      — Syntax verification helper
│   └── security-check.js    — Local security-check helper for verification support
├── sql/
│   ├── 2026-05-11-name-ownership-delete.sql — Supabase schema/RLS update for ownership + delete
│   ├── 2026-05-11-pins-read-authenticated.sql — Allows authenticated anonymous sessions to read pins
│   └── 2026-05-11-delete-and-storage-fixes.sql — Delete policy, bucket setup, and storage object policies
└── assets/
    ├── icon.svg             — PWA icon
    └── pin-placeholder.svg  — Default image when pin has no photo
```

### `index.html` — Responsibilities
- Load CDN scripts: Leaflet, Supabase JS
- Load Google Fonts via `<link>`
- Load local runtime config before app boot
- Load `css/style.css` and `js/app.js`
- Register Service Worker
- Define static DOM:
  - `#splash` — splash overlay div
  - `#username-prompt` — first-time username modal
  - `#map` — Leaflet mount target (full viewport)
  - `#modal-add` — Add Pin modal
  - `#add-photo-preview-wrap` — inline preview for the selected add-photo file
  - `#modal-view` — View Pin modal
  - `#photo-lightbox` — full-screen photo viewer
  - `#toast` — notification bar for errors/success

### Layer Mapping

| Build Layer | Files | Responsibility |
|-------------|-------|----------------|
| Data model / validation | `js/data.js` | Input limits, sanitization, validation rules |
| Core / business logic | `js/pinLogic.js` | Pin state rules, storage-path helpers, display-safe pin shaping |
| Runtime config | `js/config.js`, `js/config.local.js` | Resolve Supabase base URL and anon key safely at runtime |
| Service layer | `js/supabase.js`, `js/username.js` | Supabase calls, account/name persistence helpers |
| API / interface layer | `js/app.js`, `js/map.js` | Submit-flow orchestration, realtime wiring, map interaction |
| UI layer | `index.html`, `css/style.css`, `js/ui.js` | DOM structure, styling, modal/toast/splash behavior |

### `js/app.js` — Sections & Responsibilities

```
── CONFIG ──────────────────────────────────────────────────────
  resolveSupabaseConfig()   → { supabaseUrl, supabaseAnonKey }
    Reads runtime config from local config source instead of hardcoded placeholders.

── SUPABASE CLIENT ─────────────────────────────────────────────
  initSupabase()      → SupabaseClient
    Creates and returns the Supabase client instance.

── USERNAME ────────────────────────────────────────────────────
  getUsername()        → string | null
    Reads username from localStorage key `breadcrumbs_username`.

  promptUsername()     → Promise<string>
    If no active name in localStorage, shows #username-prompt modal.
    User enters a unique name account or reuses an existing known name.
    Active name is saved locally for reuse.
    Auto-fills "submitted by" field in Add Pin modal and acts as ownership identity.

── AUTH ────────────────────────────────────────────────────────
  ensureAnonSession() → Promise<Session>
    Calls signInAnonymously() if no active session exists.
    Called only when user attempts to submit a pin, not on load.

── MAP ─────────────────────────────────────────────────────────
  initMap()           → LeafletMap
    Creates full-screen Leaflet map, full world view, CartoDB tiles.
    Attaches tap handler → openAddModal(latlng).

── PINS ────────────────────────────────────────────────────────
  loadPins()          → Promise<void>
    Fetches all rows from `pins` table.
    Calls renderPin() for each.

  renderPin(pin)      → LeafletMarker
    Creates marker at pin.lat / pin.lng.
    Color: bright (unseen) or muted (seen), based on seenPins Set.
    Attaches click handler → openViewModal(pin).

  canDeletePin(pin, currentUsername) → boolean
    Returns true only when the active name matches the pin owner name.

  markSeen(pinId)     → Promise<void>
    Inserts row into `views` table: { username, pin_id }.
    Unique index silently ignores if already marked seen.
    Updates marker color to muted immediately.

  loadSeenPins()      → Promise<Set<string>>
    Fetches all pin_ids from `views` WHERE username = current user.
    Returns as a Set for fast lookup during pin rendering.

  isUnseen(pinId)     → boolean
    Returns true if pinId not in the loaded seen Set.

── REALTIME ────────────────────────────────────────────────────
  subscribeRealtime() → void
    Subscribes to postgres_changes INSERT on `pins`.
    On new event: calls renderPin(newPin) — always renders as unseen.

── ADD PIN MODAL ───────────────────────────────────────────────
  openAddModal(latlng) → void
    Drops temporary marker at latlng.
    Populates hidden lat/lng fields.
    Auto-fills submitted_by from getUsername().
    Shows #modal-add.

  closeAddModal()      → void
    Removes temporary marker.
    Resets and hides #modal-add.

  validateAddForm(formData) → { valid: boolean, errors: string[] }
    Enforces:
      place_name: non-empty, max 200 chars
      note: max 1000 chars
      submitted_by: max 100 chars
      lat: -90 to 90
      lng: -180 to 180
      file: if present, must be jpeg/png/webp, max 5MB

  submitPin(formData, latlng) → Promise<void>
    1. validateAddForm() — abort if invalid
    2. ensureAnonSession()
    3. If file: uploadPhoto(file) → image_path
    4. insertPin({ place_name, note, submitted_by, owner_name, lat, lng, image_path })
    5. If step 4 fails after step 3 succeeded: delete uploaded file
    6. On full success only: closeAddModal()
    7. showToast('Memory added!')
    Note: insert uses a plain insert and does not request the inserted row back, because the returned-row read path previously triggered RLS failure.

── DELETE PIN FLOW ─────────────────────────────────────────────
  confirmDeletePin(pin) → Promise<boolean>
    Shows a permanent-delete confirmation dialog.

  deletePinFlow(pin) → Promise<void>
    1. Verify current active name matches pin owner
    2. Confirm delete
    3. Delete pin row using `id` + `owner_name`
    4. If deleted pin had photo: attempt photo cleanup from Storage
    5. Remove pin from map
    6. Show success or partial-cleanup failure feedback

── STORAGE ─────────────────────────────────────────────────────
  uploadPhoto(file)   → Promise<string>
    Generates bucket-relative filename from a UUID and file extension.
    Uploads to Supabase Storage bucket `pins`.
    Returns image_path string (not full URL).
    On failure: throws error, no auto-retry.

  deletePhoto(image_path) → Promise<void>
    Removes one previously uploaded file from Storage bucket `pins`.
    Called only when upload succeeded but later pin insert failed.
    Cleanup failure is logged with context and never shown as raw backend detail.

  deletePin(pinId) → Promise<void>
    Deletes one pin row after ownership/auth rules allow it.

  getPhotoUrl(image_path) → string
    Constructs full public URL from SUPABASE_URL + image_path.
    Returns placeholder asset path if image_path is null.

── VIEW PIN MODAL ──────────────────────────────────────────────
  openViewModal(pin)  → void
    Populates #modal-view with pin data.
    Calls markSeen(pin.id).
    Shows delete control only when current user is the owner.
    Real photos can be tapped to open the full-screen lightbox.
    Shows #modal-view.

  closeViewModal()    → void
    Hides and clears #modal-view.

── FAILURE STATE CONTRACT ──────────────────────────────────────
  handleSubmitFailure(stage, formState, image_path?) → void
    Rules:
      - never auto-retry upload or insert
      - keep Add Pin modal open
      - preserve place name, note, and submitted_by values
      - clear file input so the user intentionally reselects the photo
      - keep temporary marker visible
      - if upload succeeded but insert failed, delete uploaded file first
      - user must tap Save Memory again to retry

── TOAST ───────────────────────────────────────────────────────
  showToast(message, type) → void
    type: 'success' | 'error' | 'info'
    Displays #toast for 3 seconds then fades.
    Never exposes raw Supabase error objects to user.

── SPLASH ──────────────────────────────────────────────────────
  initSplash()        → void
    Shows #splash on load.
    "Start Exploring" button calls hideSplash().
    hideSplash() fades out #splash, calls loadPins() + subscribeRealtime().

── INIT ────────────────────────────────────────────────────────
  init()              → void
    Entry point. Called on DOMContentLoaded.
    Order:
      1. initSupabase()
      2. initMap()
      3. promptUsername()    ← ensure username exists first
      4. loadSeenPins()      ← fetch this user's seen pins from DB
      5. initSplash()        ← then show splash / load pins
```

### `sw.js` — Responsibilities
- Cache on install: `index.html`, `css/style.css`, all runtime `js/` modules used by the app, runtime config files, `manifest.json`, and all `assets/`
- Cache on fetch: map tiles (cache-first), Supabase photo URLs (cache-first), CDN scripts (cache-first with network fallback)
- Strategy: **Cache-first** for static assets and tiles; **Network-first** for Supabase API calls

### `manifest.json` — Fields
```
name:             "Breadcrumbs"
short_name:       "Breadcrumbs"
start_url:        "/"
display:          "standalone"
background_color: "#FDFBF7"
theme_color:      "#8A7560"
icons:            SVG icon
```

---

## 2A. LIVE BUGS FOUND AND FIXED

| Area | Root Cause | Fix |
|------|------------|-----|
| Pin insert | `insert(...).select().single()` caused the write to fail when the returned-row read hit RLS | Changed insert path to plain `insert(...)` |
| Pin visibility after auth | Anonymous auth sessions use `authenticated`, but the read policy only allowed `anon` | Added `authenticated` to the read policy |
| New-pin placement drift | Entrance animation overwrote Leaflet wrapper transform | Animate the inner marker element instead of the Leaflet wrapper |
| Delete flow | Missing delete policy for authenticated anonymous sessions | Added `pins` delete policy |
| Photo upload | `pins` storage bucket and storage policies were missing | Created/configured bucket and storage object policies |
| Photo UX | No selected-file feedback and cropped image display | Added preview, selected state, contain-fit view, and full-screen lightbox |

---

## 3. DATA MODEL

### `accounts` Table
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
