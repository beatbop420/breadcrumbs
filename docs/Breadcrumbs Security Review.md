# Breadcrumbs — Security Review
**Date:** 2026-05-12
**Status:** COMPLETE WITH ACCEPTED RISK — acceptable for a tiny trusted family group, not acceptable for hostile or public use

## Findings

### 1. Critical — owner-only delete is not enforced server-side

The browser hides delete for non-owners, but the database/storage policies are still broad enough that any authenticated anonymous session can delete any pin or photo directly through Supabase if it knows the target id/path.

Evidence:
- `public.pins` delete policy uses `using (true)` in [2026-05-11-delete-and-storage-fixes.sql](/home/petra/Desktop/breadcrumbs/sql/2026-05-11-delete-and-storage-fixes.sql:6)
- storage delete policy uses only `bucket_id = 'pins'` in [2026-05-11-delete-and-storage-fixes.sql](/home/petra/Desktop/breadcrumbs/sql/2026-05-11-delete-and-storage-fixes.sql:57)
- app ownership checks exist only in browser code in [app.js](/home/petra/Desktop/breadcrumbs/js/app.js:84) and [pinLogic.js](/home/petra/Desktop/breadcrumbs/js/pinLogic.js:47)

Impact:
- a malicious user can bypass the UI and call Supabase directly
- cross-user delete is possible under the current live policy model

### 2. High — name ownership is not bound to auth identity

The app treats a plain saved name as identity, but that name is stored only in browser localStorage and is not cryptographically bound to the Supabase session.

Evidence:
- saved name comes from localStorage in [username.js](/home/petra/Desktop/breadcrumbs/js/username.js:5)
- the insert payload trusts the active saved name in [pinLogic.js](/home/petra/Desktop/breadcrumbs/js/pinLogic.js:51)
- accounts are readable/insertable with public policies in [2026-05-11-name-ownership-delete.sql](/home/petra/Desktop/breadcrumbs/sql/2026-05-11-name-ownership-delete.sql:9)

Impact:
- any user can claim any name in the browser
- inserts and ownership are trust-based, not strongly authenticated

### 3. Medium — protected write auth was inconsistent before the Phase 4 patch

The “mark pin seen” write path previously relied on whatever session state happened to exist. That is now hardened.

Work completed in this pass:
- added `ensureAnonymousSession()` in [supabase.js](/home/petra/Desktop/breadcrumbs/js/supabase.js:24)
- protected the seen-pin write path in [app.js](/home/petra/Desktop/breadcrumbs/js/app.js:148)

### 4. Medium — server-side validation coverage is incomplete and partly unversioned

Client-side validation is strong, but the repo does not fully capture matching server-side enforcement for every field, and the `views` table/policies are not versioned in SQL here.

Evidence:
- client validation rules are in [data.js](/home/petra/Desktop/breadcrumbs/js/data.js:29)
- repo SQL covers `accounts`, read policy changes, and delete/storage changes, but not a full versioned `views` schema/policy set

Impact:
- direct API callers may bypass some client-only limits
- security-critical Supabase state is harder to audit from git alone

### 5. Low — raw backend errors are logged to the browser console

User-facing errors are mostly generic, but raw error objects/messages are still written to the console for debugging.

Evidence:
- examples in [app.js](/home/petra/Desktop/breadcrumbs/js/app.js:47), [config.js](/home/petra/Desktop/breadcrumbs/js/config.js:18), [ui.js](/home/petra/Desktop/breadcrumbs/js/ui.js:196)

Impact:
- backend details may be exposed to anyone using browser devtools
- this is lower risk here because the app is low-sensitivity and public-read by design

---

## Security Review Checklist

| Check description | Finding | Evidence |
|---|---|---|
| Authentication enforced on pin insert | Pass | `handlePinSubmit()` calls `ensureAnonymousSession()` before upload/insert in [app.js](/home/petra/Desktop/breadcrumbs/js/app.js:55) |
| Authentication enforced on photo upload | Pass | `ensureAnonymousSession()` runs before `uploadPhoto()` in [app.js](/home/petra/Desktop/breadcrumbs/js/app.js:55) |
| Authentication enforced on delete flow | Pass | `handlePinDelete()` calls `ensureAnonymousSession()` before delete operations in [app.js](/home/petra/Desktop/breadcrumbs/js/app.js:90) |
| Authentication enforced on seen-pin write | Pass | `handlePinClick()` now calls `ensureAnonymousSession()` before `insertView()` in [app.js](/home/petra/Desktop/breadcrumbs/js/app.js:148) |
| Any protected resource accessed without valid auth in app code | Pass after patch | Protected writes now use `ensureAnonymousSession()` in [app.js](/home/petra/Desktop/breadcrumbs/js/app.js:55) and [app.js](/home/petra/Desktop/breadcrumbs/js/app.js:148) |
| Requests without auth / expired token / malformed token handling | Partial | App delegates session validation to Supabase via `auth.getSession()` and `signInAnonymously()` in [supabase.js](/home/petra/Desktop/breadcrumbs/js/supabase.js:18); no full live integration tests for expired/malformed tokens were run offline |
| Authorization checked on owner-specific delete action | Fail | Browser checks owner in [pinLogic.js](/home/petra/Desktop/breadcrumbs/js/pinLogic.js:47), but server-side delete policy is broad in [2026-05-11-delete-and-storage-fixes.sql](/home/petra/Desktop/breadcrumbs/sql/2026-05-11-delete-and-storage-fixes.sql:6) |
| User A prevented from deleting User B pin directly via API | Fail | `using (true)` on `public.pins` delete allows authenticated sessions broadly in [2026-05-11-delete-and-storage-fixes.sql](/home/petra/Desktop/breadcrumbs/sql/2026-05-11-delete-and-storage-fixes.sql:6) |
| User A prevented from deleting User B photo directly via API | Fail | storage delete policy checks only bucket membership in [2026-05-11-delete-and-storage-fixes.sql](/home/petra/Desktop/breadcrumbs/sql/2026-05-11-delete-and-storage-fixes.sql:57) |
| Privilege escalation to admin actions | Waived / N/A | No admin role or admin endpoints exist in this app |
| External inputs validated on client | Pass | username, place name, note, submitter, lat, lng, photo are validated in [data.js](/home/petra/Desktop/breadcrumbs/js/data.js:29) |
| Validation enforced server-side for every external input | Fail | server-side enforcement is incomplete/unversioned for all pin fields; repo SQL does not fully mirror [data.js](/home/petra/Desktop/breadcrumbs/js/data.js:29) |
| Validation rules are specific | Pass | rules include type/length/range/MIME/size in [data.js](/home/petra/Desktop/breadcrumbs/js/data.js:29) |
| Password hashing with bcrypt/argon2 | Waived / N/A | App has no password system |
| Sensitive data encrypted at rest | Partial / Delegated | Supabase-managed data at rest is provider-managed; browser stores username and cached public pin data in localStorage in [username.js](/home/petra/Desktop/breadcrumbs/js/username.js:5) and [offlineCache.js](/home/petra/Desktop/breadcrumbs/js/offlineCache.js:4) |
| HTTPS enforced in transit | Pass | frontend config uses `https://` Supabase URL in [config.local.js](/home/petra/Desktop/breadcrumbs/js/config.local.js:2) and CDN assets in [index.html](/home/petra/Desktop/breadcrumbs/index.html:10) |
| PII excluded from logs | Partial | app does not log note/place values directly, but raw backend errors are logged in [app.js](/home/petra/Desktop/breadcrumbs/js/app.js:73) and [ui.js](/home/petra/Desktop/breadcrumbs/js/ui.js:272) |
| User-facing errors hide internal details | Pass | user toasts/messages are generic in [app.js](/home/petra/Desktop/breadcrumbs/js/app.js:27) and [app.js](/home/petra/Desktop/breadcrumbs/js/app.js:129) |
| Auth errors avoid username/password enumeration | Waived / N/A | No password login flow exists |
| Dependencies pinned to specific versions | Pass | pinned in [package.json](/home/petra/Desktop/breadcrumbs/package.json:5), [package-lock.json](/home/petra/Desktop/breadcrumbs/package-lock.json:1), and CDN tags in [index.html](/home/petra/Desktop/breadcrumbs/index.html:119) |
| Dependencies from official sources | Pass | npm registry packages in [package-lock.json](/home/petra/Desktop/breadcrumbs/package-lock.json:1), unpkg/jsDelivr CDNs in [index.html](/home/petra/Desktop/breadcrumbs/index.html:10) |
| Known dependency vulnerabilities | Pass | `npm audit --audit-level=high` returned `found 0 vulnerabilities` on 2026-05-12 |

---

## Risk Acceptance Decision

The biggest Phase 4 issue is not a missing `if` statement. It is a design limit.

Current product model:
- same plain-text name can be reused on any device
- there is no password, secret, or real login
- anonymous Supabase auth is only a transport/session mechanism

That means true owner-only authorization cannot be proven server-side under the current model.

To actually remove that risk, the product would need one of these:

1. real auth identity per user
2. a secret/passcode tied to each name
3. a backend/edge function that verifies a real secret before destructive actions

Without one of those, the app stays trust-based.

**Accepted decision for this phase:** keep the trust-based model for now because the app is only for a tiny trusted family group of about five people.

Plain-English consequence:
- normal family use is acceptable
- a determined bad actor inside that group could still fake a name or bypass the UI
- this is waived for the current use case and must be revisited before any wider rollout

Current live site:
- `https://beatbop420.github.io/breadcrumbs/`

---

## Current Phase 4 State

Work completed in this pass:
- reviewed authentication, authorization, validation, logging, and dependencies
- ran dependency audit: `found 0 vulnerabilities`
- hardened protected writes so the seen-pin write path now also ensures a session

Phase 4 is **complete with accepted risk**.

Blunt summary:
- secure enough for a small trusted family scrapbook
- not secure enough for strangers, public users, or hostile users
