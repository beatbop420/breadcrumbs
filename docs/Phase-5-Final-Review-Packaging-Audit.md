# Breadcrumbs — Phase 5 Final Review & Packaging Audit
**Date:** 2026-05-13  
**Commit audited:** `8bfa748`  
**Working tree at audit time:** clean

**Superseded note:** This file records the pre-cleanup audit against commit `8bfa748`. Follow-up cleanup on 2026-05-14 refreshed the architecture, final review, traceability, and handoff docs and cleaned up the iPhone photo upload path. A second docs refresh on 2026-05-28 updated the active closeout docs for the Cloudinary photo-upload path, current commit `c113379`, and current verification totals. Treat this file as historical evidence, not the latest project status.

## 1. High-Signal Findings

- High: the current [Breadcrumbs Architecture Document.md](/home/petra/Desktop/breadcrumbs/docs/Breadcrumbs%20Architecture%20Document.md:1) contains stale appended content after its approved summary. It restarts at an older API/security section after line 103 and contradicts current code about edit support and update policy reality. Evidence: [Breadcrumbs Architecture Document.md](/home/petra/Desktop/breadcrumbs/docs/Breadcrumbs%20Architecture%20Document.md:103), [js/app.js](/home/petra/Desktop/breadcrumbs/js/app.js:266), [js/supabase.js](/home/petra/Desktop/breadcrumbs/js/supabase.js:134).
- High: the current Requirements Lock document is a **review-scope document**, not a product-functional requirements spec. That means a strict requirement-to-feature traceability matrix is structurally incomplete by design. Evidence: [Breadcrumbs Requirements Lock Document.md](/home/petra/Desktop/breadcrumbs/docs/Breadcrumbs%20Requirements%20Lock%20Document.md:6).
- Medium: strict configuration review does not fully pass. The live Supabase project URL and anon key are embedded in [index.html](/home/petra/Desktop/breadcrumbs/index.html:135) and duplicated in [js/config.local.js](/home/petra/Desktop/breadcrumbs/js/config.local.js:1); GitHub Pages path assumptions are hardcoded in [manifest.json](/home/petra/Desktop/breadcrumbs/manifest.json:5) and [sw.js](/home/petra/Desktop/breadcrumbs/sw.js:3).
- Medium: closeout docs are partially stale after the `8bfa748` commit. [Breadcrumbs Final Review.md](/home/petra/Desktop/breadcrumbs/docs/Breadcrumbs%20Final%20Review.md:48) still says the repo is uncommitted, [Phase-5-Traceability-Audit.md](/home/petra/Desktop/breadcrumbs/docs/Phase-5-Traceability-Audit.md:37) says the same, and [SESSION-HANDOFF.md](/home/petra/Desktop/breadcrumbs/docs/SESSION-HANDOFF.md:6) does not list the current head commit.
- Low: there are tracked assets with no runtime references: [assets/crow.png](/home/petra/Desktop/breadcrumbs/assets/crow.png:1), [assets/crow-fly.png](/home/petra/Desktop/breadcrumbs/assets/crow-fly.png:1), and [assets/icon.png](/home/petra/Desktop/breadcrumbs/assets/icon.png:1). They are potential scope creep unless they are intentionally kept as source art.
- Accepted security issue: server-side delete/storage policies remain broader than the UI implies. Evidence: [sql/2026-05-11-delete-and-storage-fixes.sql](/home/petra/Desktop/breadcrumbs/sql/2026-05-11-delete-and-storage-fixes.sql:15), [sql/2026-05-11-delete-and-storage-fixes.sql](/home/petra/Desktop/breadcrumbs/sql/2026-05-11-delete-and-storage-fixes.sql:86). This was already accepted as a Phase 4 waiver for trusted-family use.

## 2. Current Verification Snapshot

Executed on the current repository state:

```text
npm test
Total files: 9
Total tests: 213
Passed: 213
Failed: 0
Skipped: 0

node scripts/check-syntax.js
Checked_files: 24
Failures: 0

npm run lint
exit 0

node scripts/security-check.js
Security checks passed. No forbidden patterns found.

npm audit --audit-level=high
found 0 vulnerabilities
```

## 3. Requirement IDs Used In This Audit

### Official locked review requirements

- `RL-1`: review and verify the existing repository as it exists now
- `RL-2`: use the current checked-out repo state, including the original draft changes, as the locked baseline
- `RL-3`: review existing runtime code
- `RL-4`: review existing tests and local verification scripts
- `RL-5`: review existing phase documents in `docs/`
- `RL-6`: review the original draft changes
- `RL-7`: review security-relevant frontend and Supabase-related code
- `RL-8`: produce an architecture and verification plan
- `RL-9`: implement only if verification proves a real defect
- `RL-10`: produce test/syntax/lint/security/audit results with actual output
- `RL-11`: produce a dedicated security checklist with `Pass` or `Waived`
- `RL-12`: produce traceability, scope, consistency, and packaging review
- `RL-13`: every finding must include concrete evidence
- `RL-14`: repository-state changes after scope lock must be reflected in later phase docs
- `RL-15`: conclusions must be based on code evidence or executed verification evidence

### Inferred app capability groups

These are **not** in the current Requirements Lock document. They are used only to complete the file-by-file scope and package analysis for the actual program.

- `APP-1`: static app shell, startup flow, and deployment shell
- `APP-2`: username capture and local identity persistence
- `APP-3`: map rendering, map interaction, and geocoding
- `APP-4`: input validation and safe rendering
- `APP-5`: pin add/view/edit/delete UX
- `APP-6`: Supabase data, storage, realtime, and SQL policy support
- `APP-7`: offline and PWA behavior
- `APP-8`: automated verification tooling
- `APP-9`: release documentation, handoff, and packaging artifacts

## 4. Requirements Traceability Matrix

### 4.1 Strict traceability against the current Requirements Lock document

| Req | Requirement | Implemented In | Verified By | Status |
|---|---|---|---|---|
| `RL-1` | Review existing repo as-is | [Breadcrumbs Requirements Lock Document.md](/home/petra/Desktop/breadcrumbs/docs/Breadcrumbs%20Requirements%20Lock%20Document.md:6), [Breadcrumbs Final Review.md](/home/petra/Desktop/breadcrumbs/docs/Breadcrumbs%20Final%20Review.md:7) | Manual document review | Manual only |
| `RL-2` | Lock current checked-out baseline incl. original draft changes | [Breadcrumbs Requirements Lock Document.md](/home/petra/Desktop/breadcrumbs/docs/Breadcrumbs%20Requirements%20Lock%20Document.md:15), [Breadcrumbs Verification Report.md](/home/petra/Desktop/breadcrumbs/docs/Breadcrumbs%20Verification%20Report.md:7) | `git log --oneline -5`; current clean `git status --short` | Manual only |
| `RL-3` | Review existing runtime code | `js/*.js`, [index.html](/home/petra/Desktop/breadcrumbs/index.html:1), [sw.js](/home/petra/Desktop/breadcrumbs/sw.js:1) | `npm test`, syntax, lint, code review | Pass |
| `RL-4` | Review tests and verification scripts | `js/*.test.js`, `scripts/*.js`, [package.json](/home/petra/Desktop/breadcrumbs/package.json:5) | `npm test`, `node scripts/check-syntax.js`, `npm run lint`, `node scripts/security-check.js` | Pass |
| `RL-5` | Review existing phase docs | `docs/*.md` | Manual doc review | Pass with documentation drift findings |
| `RL-6` | Review original draft changes | [Breadcrumbs Requirements Lock Document.md](/home/petra/Desktop/breadcrumbs/docs/Breadcrumbs%20Requirements%20Lock%20Document.md:24), `8bfa748` commit history | Commit history + final code review | Pass |
| `RL-7` | Review security-relevant frontend and Supabase code | [js/app.js](/home/petra/Desktop/breadcrumbs/js/app.js:131), [js/supabase.js](/home/petra/Desktop/breadcrumbs/js/supabase.js:26), `sql/*.sql` | Phase 4 review + current code review | Pass with accepted waivers |
| `RL-8` | Produce architecture and verification plan | [Breadcrumbs Architecture Document.md](/home/petra/Desktop/breadcrumbs/docs/Breadcrumbs%20Architecture%20Document.md:1) | Manual doc review | Gap: doc contains stale appended sections |
| `RL-9` | Only implement after proven defect | [Breadcrumbs Verification Report.md](/home/petra/Desktop/breadcrumbs/docs/Breadcrumbs%20Verification%20Report.md:13), [app.test.js](/home/petra/Desktop/breadcrumbs/js/app.test.js:1), [ui.test.js](/home/petra/Desktop/breadcrumbs/js/ui.test.js:1) | Current code + regression tests | Pass |
| `RL-10` | Produce verification with actual output | [Breadcrumbs Verification Report.md](/home/petra/Desktop/breadcrumbs/docs/Breadcrumbs%20Verification%20Report.md:45) | Rerun outputs in Section 2 | Pass |
| `RL-11` | Produce security checklist with `Pass`/`Waived` | [Breadcrumbs Security Review.md](/home/petra/Desktop/breadcrumbs/docs/Breadcrumbs%20Security%20Review.md:12) | Manual doc review | Pass |
| `RL-12` | Produce traceability/scope/consistency/packaging review | [Phase-5-Traceability-Audit.md](/home/petra/Desktop/breadcrumbs/docs/Phase-5-Traceability-Audit.md:1), [Breadcrumbs Final Review.md](/home/petra/Desktop/breadcrumbs/docs/Breadcrumbs%20Final%20Review.md:22), this audit | Current audit | Pass with stale closeout docs noted |
| `RL-13` | Findings require concrete evidence | Phase 3, Phase 4, this audit | File/line references and command output | Pass |
| `RL-14` | Repo-state changes must be reflected in later phase docs | [Breadcrumbs Final Review.md](/home/petra/Desktop/breadcrumbs/docs/Breadcrumbs%20Final%20Review.md:48), [Phase-5-Traceability-Audit.md](/home/petra/Desktop/breadcrumbs/docs/Phase-5-Traceability-Audit.md:37), [SESSION-HANDOFF.md](/home/petra/Desktop/breadcrumbs/docs/SESSION-HANDOFF.md:6) | Current repo state vs docs | Gap |
| `RL-15` | Conclusions based on code or executed evidence | Phase 3, Phase 4, this audit | File/line citations and rerun commands | Pass |

### 4.2 Structural gap

The current Requirements Lock document does **not** contain a product-functional requirement set. That creates a hard gap for any strict “every feature requirement must map to implementation and tests” exercise. The closest honest result is:

- review/process requirements: mostly covered
- functional product requirements: not formally locked in a requirements spec

### 4.3 Best-effort feature coverage for the actual program

| Capability | Main Files | Tests | Status |
|---|---|---|---|
| `APP-1` shell/startup/PWA shell | [index.html](/home/petra/Desktop/breadcrumbs/index.html:1), [js/app.js](/home/petra/Desktop/breadcrumbs/js/app.js:396), [manifest.json](/home/petra/Desktop/breadcrumbs/manifest.json:1), [sw.js](/home/petra/Desktop/breadcrumbs/sw.js:1) | [config.test.js](/home/petra/Desktop/breadcrumbs/js/config.test.js:1), [map.test.js](/home/petra/Desktop/breadcrumbs/js/map.test.js:1) | Covered, no service-worker E2E test |
| `APP-2` username persistence | [js/username.js](/home/petra/Desktop/breadcrumbs/js/username.js:1), [js/app.js](/home/petra/Desktop/breadcrumbs/js/app.js:374), [js/ui.js](/home/petra/Desktop/breadcrumbs/js/ui.js:101) | [username.test.js](/home/petra/Desktop/breadcrumbs/js/username.test.js:1), [ui.test.js](/home/petra/Desktop/breadcrumbs/js/ui.test.js:1) | Covered |
| `APP-3` map/geocoding | [js/map.js](/home/petra/Desktop/breadcrumbs/js/map.js:33), [js/app.js](/home/petra/Desktop/breadcrumbs/js/app.js:14) | [map.test.js](/home/petra/Desktop/breadcrumbs/js/map.test.js:1) | Gap: geocoding itself has no direct automated test |
| `APP-4` validation/safe rendering | [js/data.js](/home/petra/Desktop/breadcrumbs/js/data.js:34), [js/pinLogic.js](/home/petra/Desktop/breadcrumbs/js/pinLogic.js:73) | [data.test.js](/home/petra/Desktop/breadcrumbs/js/data.test.js:1), [pinLogic.test.js](/home/petra/Desktop/breadcrumbs/js/pinLogic.test.js:1) | Covered |
| `APP-5` add/view/edit/delete UX | [js/app.js](/home/petra/Desktop/breadcrumbs/js/app.js:131), [js/app.js](/home/petra/Desktop/breadcrumbs/js/app.js:165), [js/app.js](/home/petra/Desktop/breadcrumbs/js/app.js:266), [js/ui.js](/home/petra/Desktop/breadcrumbs/js/ui.js:308), [index.html](/home/petra/Desktop/breadcrumbs/index.html:65) | [app.test.js](/home/petra/Desktop/breadcrumbs/js/app.test.js:1), [ui.test.js](/home/petra/Desktop/breadcrumbs/js/ui.test.js:1) | Covered |
| `APP-6` Supabase/storage/realtime | [js/supabase.js](/home/petra/Desktop/breadcrumbs/js/supabase.js:1), `sql/*.sql` | [supabase.test.js](/home/petra/Desktop/breadcrumbs/js/supabase.test.js:1) | Covered with accepted authorization waiver |
| `APP-7` offline cache/PWA | [js/offlineCache.js](/home/petra/Desktop/breadcrumbs/js/offlineCache.js:1), [sw.js](/home/petra/Desktop/breadcrumbs/sw.js:1) | [offlineCache.test.js](/home/petra/Desktop/breadcrumbs/js/offlineCache.test.js:1) | Gap: no automated service-worker behavior test |
| `APP-8` verification tooling | `scripts/*.js`, [package.json](/home/petra/Desktop/breadcrumbs/package.json:5), [eslint.config.js](/home/petra/Desktop/breadcrumbs/eslint.config.js:1) | Self-verified by current rerun outputs | Covered |
| `APP-9` documentation/package | `README.md`, `docs/*.md`, `docs/exports/*.docx` | Manual review only | Gap: some closeout docs are stale after commit |

## 5. Scope Creep Check

### 5.1 Summary

- No orphan **runtime code** files were found.
- Potential scope creep exists in a few **unreferenced assets**.
- Strict scope-creep checking is limited by the lack of product-functional requirements in the Requirements Lock document.

### 5.2 Potential scope creep findings

| File | Finding | Evidence |
|---|---|---|
| [assets/crow.png](/home/petra/Desktop/breadcrumbs/assets/crow.png:1) | Potential scope creep | Only referenced by review docs as a reviewed draft asset; no runtime reference found |
| [assets/crow-fly.png](/home/petra/Desktop/breadcrumbs/assets/crow-fly.png:1) | Potential scope creep | No runtime or doc reference found |
| [assets/icon.png](/home/petra/Desktop/breadcrumbs/assets/icon.png:1) | Potential scope creep | No runtime or doc reference found |

## 6. Architecture Drift Check

| Type | Difference | Evidence | Result |
|---|---|---|---|
| `b. Unjustified drift` | Architecture doc contains stale appended sections after the approved summary and effectively becomes two documents in one | [Breadcrumbs Architecture Document.md](/home/petra/Desktop/breadcrumbs/docs/Breadcrumbs%20Architecture%20Document.md:103) | Must be corrected |
| `b. Unjustified drift` | Architecture doc says “Update: No policies” | [Breadcrumbs Architecture Document.md](/home/petra/Desktop/breadcrumbs/docs/Breadcrumbs%20Architecture%20Document.md:211), [js/supabase.js](/home/petra/Desktop/breadcrumbs/js/supabase.js:134), [js/app.js](/home/petra/Desktop/breadcrumbs/js/app.js:266) | Must be corrected |
| `b. Unjustified drift` | Architecture doc says insecure-design mitigation includes “No general update flow” | [Breadcrumbs Architecture Document.md](/home/petra/Desktop/breadcrumbs/docs/Breadcrumbs%20Architecture%20Document.md:239), [index.html](/home/petra/Desktop/breadcrumbs/index.html:118), [js/app.js](/home/petra/Desktop/breadcrumbs/js/app.js:266) | Must be corrected |
| `b. Unjustified drift` | Architecture doc implies owner-only delete is enforced by server policy, but the live SQL delete policies are broad | [Breadcrumbs Architecture Document.md](/home/petra/Desktop/breadcrumbs/docs/Breadcrumbs%20Architecture%20Document.md:208), [sql/2026-05-11-delete-and-storage-fixes.sql](/home/petra/Desktop/breadcrumbs/sql/2026-05-11-delete-and-storage-fixes.sql:15), [sql/2026-05-11-delete-and-storage-fixes.sql](/home/petra/Desktop/breadcrumbs/sql/2026-05-11-delete-and-storage-fixes.sql:86) | Must be corrected or explicitly waived there too |
| `c. Missed addition` | Architecture doc does not call out GitHub Pages path coupling in `manifest.json` and `sw.js` | [manifest.json](/home/petra/Desktop/breadcrumbs/manifest.json:5), [sw.js](/home/petra/Desktop/breadcrumbs/sw.js:3) | Architecture doc should be updated |
| `a. Justified deviation` | Typed place names can move the temporary marker via geocoding | [Breadcrumbs Architecture Document.md](/home/petra/Desktop/breadcrumbs/docs/Breadcrumbs%20Architecture%20Document.md:71), [js/app.js](/home/petra/Desktop/breadcrumbs/js/app.js:14) | Correct current behavior |
| `a. Justified deviation` | Owner edit support exists in the current UI/backend flow | [Breadcrumbs Architecture Document.md](/home/petra/Desktop/breadcrumbs/docs/Breadcrumbs%20Architecture%20Document.md:72), [js/app.js](/home/petra/Desktop/breadcrumbs/js/app.js:266), [js/supabase.js](/home/petra/Desktop/breadcrumbs/js/supabase.js:134) | Correct current behavior |

## 7. Consistency Check

| Check | Result | Evidence |
|---|---|---|
| Naming conventions | Mostly consistent | Client uses camelCase form data and helpers; DB payloads use snake_case through the adapter in [js/pinLogic.js](/home/petra/Desktop/breadcrumbs/js/pinLogic.js:59) and the edit fallback in [js/ui.js](/home/petra/Desktop/breadcrumbs/js/ui.js:157) |
| Error handling patterns | Mostly consistent for user-facing messages; mixed in developer logging | Generic UI messages in [js/app.js](/home/petra/Desktop/breadcrumbs/js/app.js:159), [js/app.js](/home/petra/Desktop/breadcrumbs/js/app.js:294), [js/ui.js](/home/petra/Desktop/breadcrumbs/js/ui.js:354); developer logs vary across `console.error`, `console.warn`, and `console.info` |
| Logging patterns | Consistent prefix, mixed verbosity | Most logs use a `[Breadcrumbs]` prefix in [js/app.js](/home/petra/Desktop/breadcrumbs/js/app.js:151), [js/map.js](/home/petra/Desktop/breadcrumbs/js/map.js:54), [js/supabase.js](/home/petra/Desktop/breadcrumbs/js/supabase.js:174), [js/config.js](/home/petra/Desktop/breadcrumbs/js/config.js:22) |
| Conflicting implementations of same logic | One real conflict remains | Client-side ownership logic is strict in [js/pinLogic.js](/home/petra/Desktop/breadcrumbs/js/pinLogic.js:53), but server-side delete/storage policies are broad in [sql/2026-05-11-delete-and-storage-fixes.sql](/home/petra/Desktop/breadcrumbs/sql/2026-05-11-delete-and-storage-fixes.sql:15) and [sql/2026-05-11-delete-and-storage-fixes.sql](/home/petra/Desktop/breadcrumbs/sql/2026-05-11-delete-and-storage-fixes.sql:86) |
| Conflicting configuration sources | Present but controlled | Live config is embedded in [index.html](/home/petra/Desktop/breadcrumbs/index.html:135), while local fallback config also exists in [js/config.local.js](/home/petra/Desktop/breadcrumbs/js/config.local.js:1) and resolver logic in [js/config.js](/home/petra/Desktop/breadcrumbs/js/config.js:39) |

## 8. README / Documentation Check

### README status

The current [README.md](/home/petra/Desktop/breadcrumbs/README.md:1) includes all required sections from Prompt G:

- project description
- install commands
- run commands
- test commands
- deploy steps
- runtime config / environment variable section
- known limitations

### Documentation gaps

| File | Gap | Evidence |
|---|---|---|
| [Breadcrumbs Final Review.md](/home/petra/Desktop/breadcrumbs/docs/Breadcrumbs%20Final%20Review.md:48) | Packaging section still says repo is uncommitted | Current `git status --short` is clean; current head is `8bfa748` |
| [Phase-5-Traceability-Audit.md](/home/petra/Desktop/breadcrumbs/docs/Phase-5-Traceability-Audit.md:37) | Save-point notes still say repo is uncommitted | Current `git status --short` is clean |
| [SESSION-HANDOFF.md](/home/petra/Desktop/breadcrumbs/docs/SESSION-HANDOFF.md:6) | Latest commits list is stale and Phase 5 completion is not reflected | Current head is `8bfa748`; prompt-G audit happened after the listed notes |

## 9. Configuration Review

| Check | Result | Evidence |
|---|---|---|
| No hardcoded environment-specific values | Fail | [index.html](/home/petra/Desktop/breadcrumbs/index.html:135), [js/config.local.js](/home/petra/Desktop/breadcrumbs/js/config.local.js:1), [manifest.json](/home/petra/Desktop/breadcrumbs/manifest.json:5), [sw.js](/home/petra/Desktop/breadcrumbs/sw.js:3) |
| All configuration externalized | Fail | Resolver exists in [js/config.js](/home/petra/Desktop/breadcrumbs/js/config.js:39), but the deployed project still embeds concrete values in [index.html](/home/petra/Desktop/breadcrumbs/index.html:135) |
| Default configuration is secure | Partial | Placeholder rejection is good in [js/config.js](/home/petra/Desktop/breadcrumbs/js/config.js:52), and the anon key is not a secret; however the live deployment values are hardcoded and the trust model remains intentionally weak |

## 10. Delivery Package Index

| File | Purpose | Requirement / Capability Served |
|---|---|---|
| `.gitignore` | Repo hygiene | `APP-9` |
| `README.md` | User-facing project and runbook doc | `APP-9` |
| `assets/apple-touch-icon.png` | iOS install icon | `APP-1`, `APP-7` |
| `assets/crow-fly.png` | Unreferenced image asset | Potential scope creep |
| `assets/crow-swoop.png` | Delete animation sprite | `APP-5` |
| `assets/crow.png` | Unreferenced image asset | Potential scope creep |
| `assets/icon-192.png` | PWA icon | `APP-1`, `APP-7` |
| `assets/icon-512.png` | PWA icon | `APP-1`, `APP-7` |
| `assets/icon.png` | Unreferenced icon asset | Potential scope creep |
| `assets/icon.svg` | Source/packaging icon asset, also precached | `APP-7`, `APP-9` |
| `assets/pin-placeholder.svg` | Placeholder image for pins without photos | `APP-4`, `APP-5` |
| `css/style.css` | App styling | `APP-1`, `APP-5` |
| `docs/Breadcrumbs Architecture Document.md` | Phase 1 architecture/verification plan | `RL-8`, `APP-9` |
| `docs/Breadcrumbs Final Review.md` | Phase 5 closeout doc | `RL-12`, `APP-9` |
| `docs/Breadcrumbs Requirements Lock Document.md` | Phase 0 locked review scope | `RL-1`, `RL-2`, `APP-9` |
| `docs/Breadcrumbs Security Review.md` | Phase 4 security review | `RL-11`, `APP-9` |
| `docs/Breadcrumbs Verification Report.md` | Phase 3 evidence and fixes | `RL-10`, `APP-9` |
| `docs/Phase-5-Traceability-Audit.md` | Prior Phase 5 snapshot | `RL-12`, `APP-9` |
| `docs/SESSION-HANDOFF.md` | Handoff and repo state note | `APP-9` |
| `docs/exports/Breadcrumbs Architecture Document.docx` | Exported architecture doc snapshot | `APP-9` |
| `docs/exports/Breadcrumbs Documentation Bundle.docx` | Exported documentation bundle snapshot | `APP-9` |
| `docs/exports/Breadcrumbs Final Review.docx` | Exported final review snapshot | `APP-9` |
| `docs/exports/Breadcrumbs Requirements Lock Document.docx` | Exported requirements doc snapshot | `APP-9` |
| `docs/exports/Breadcrumbs Security Review.docx` | Exported security review snapshot | `APP-9` |
| `docs/exports/Breadcrumbs Verification Report.docx` | Exported verification report snapshot | `APP-9` |
| `eslint.config.js` | Lint configuration | `APP-8` |
| `index.html` | App shell, runtime config, DOM structure | `APP-1`, `APP-5`, `APP-6` |
| `js/app.js` | Startup orchestration and core flows | `APP-1`, `APP-2`, `APP-3`, `APP-5`, `APP-6`, `APP-7` |
| `js/app.test.js` | Regression tests for edit photo replacement flow | `APP-5`, `APP-8` |
| `js/config.js` | Runtime config resolution and placeholder rejection | `APP-1`, `APP-6`, `APP-8` |
| `js/config.local.js` | Local/deployment config snapshot | `APP-6`, config drift risk |
| `js/config.test.js` | Tests for config resolution | `APP-8` |
| `js/data.js` | Validation and sanitization | `APP-4` |
| `js/data.test.js` | Validation/sanitization tests | `APP-8` |
| `js/map.js` | Leaflet map behavior and delete animation | `APP-3`, `APP-5` |
| `js/map.test.js` | Map helper tests | `APP-8` |
| `js/offlineCache.js` | Local cache for pins and seen state | `APP-7` |
| `js/offlineCache.test.js` | Offline-cache tests | `APP-8` |
| `js/pinLogic.js` | Ownership checks, safe pin shaping, storage paths | `APP-4`, `APP-5`, `APP-6` |
| `js/pinLogic.test.js` | Pin logic tests | `APP-8` |
| `js/supabase.js` | Supabase client wrapper and data/storage actions | `APP-6` |
| `js/supabase.test.js` | Supabase wrapper tests | `APP-8` |
| `js/test-runner.js` | Lightweight JS test harness | `APP-8` |
| `js/ui.js` | Modal, toast, preview, and lightbox UI | `APP-2`, `APP-5` |
| `js/ui.test.js` | UI helper tests | `APP-8` |
| `js/username.js` | Saved-name persistence helpers | `APP-2` |
| `js/username.test.js` | Username persistence tests | `APP-8` |
| `manifest.json` | PWA manifest and scope | `APP-1`, `APP-7` |
| `package-lock.json` | Locked dependency graph from npm registry | `APP-8`, `APP-9` |
| `package.json` | Scripts and top-level dev dependencies | `APP-8`, `APP-9` |
| `scripts/check-syntax.js` | Syntax verification script | `APP-8` |
| `scripts/run-tests.js` | Test-suite runner | `APP-8` |
| `scripts/security-check.js` | Pattern-based local security check | `APP-8` |
| `sql/2026-05-11-delete-and-storage-fixes.sql` | Live SQL storage/delete policy setup | `APP-6` |
| `sql/2026-05-11-name-ownership-delete.sql` | Name-account and owner-name schema/policy setup | `APP-6` |
| `sql/2026-05-11-pins-read-authenticated.sql` | Pins read-policy fix for authenticated anon sessions | `APP-6` |
| `sql/2026-05-12-enable-pins-realtime.sql` | Realtime publication enablement | `APP-6` |
| `sw.js` | Service worker caching strategy | `APP-7` |

## 11. Final Disposition

### Passes

- Runtime code is currently syntactically valid, lint-clean, test-clean, and dependency-audit clean.
- The README already covers the required operational sections.
- There is no orphan core runtime code.

### Gaps

- The current requirements document is not a functional spec, so strict feature traceability is incomplete.
- The architecture document contains unjustified historical drift that should be cleaned.
- Several closeout docs are stale after the current commit.
- Configuration is not fully externalized and remains deployment-specific.
- A few tracked assets appear unused.

### Security issues still present

- Trust-based name identity rather than strong auth
- Broad server-side delete/storage policies compared to the UI promise

For the current trusted-family use case, the app is operational and the current code checks pass. For a strict Prompt G packaging audit, the repo is **not a perfect pass** until the documentation drift and configuration hardcoding issues are resolved.
