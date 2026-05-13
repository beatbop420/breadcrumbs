# Breadcrumbs — Requirements Lock Document
**Version:** 1.5
**Date:** 2026-05-11
**Status:** BASELINE SPEC — Verification is complete against this baseline, but not every item passed exactly as written. See the Verification Report for final pass/fail/exception results.

---

## 1. FUNCTIONAL REQUIREMENTS

| ID | Requirement |
|----|-------------|
| F1 | Display a full-screen interactive world map using Leaflet.js + OpenStreetMap tiles |
| F2 | Show a splash/intro overlay on first load with the message "Remember that one time..." and a "Start Exploring" button |
| F3 | User can tap anywhere on the map to drop a temporary marker and open an "Add Pin" modal |
| F4 | Add Pin modal collects: place name (required), memory/note (max 1000 chars), submitter name (max 100 chars), photo (optional, camera roll) |
| F5 | Client-side validation runs before any Supabase call, mirroring RLS rules |
| F6 | On submit: sign in anonymously → upload photo to Storage → insert row into `pins` table |
| F7 | On successful submission: modal closes, pin appears on map with bounce animation |
| F8 | Tapping an existing pin opens a view modal showing place name, photo (Polaroid style), note, submitted by, and date |
| F9 | If a pin has no photo, display a placeholder icon instead |
| F10 | All currently open instances of the app receive new pins in real time via Supabase Realtime (no refresh needed) |
| F11 | ~30 legacy pins pre-loaded in database with `is_legacy = true`, visible on map load |
| F12 | App is installable as a PWA ("Add to Home Screen") with offline viewing of already-loaded content |
| F13 | New/unseen pins display in a bright warm color; once tapped and viewed, they shift to a muted/softer color so viewers can tell if new memories have been added |
| F14 | Add Pin modal displays a live character counter for place name (max 200) and memory/note (max 1000) fields, updating as the user types |
| F15 | If photo upload or pin insert fails, the app must not automatically retry any network call; the user must manually resubmit |
| F16 | On submission failure, the Add Pin modal remains open, keeps the typed place name, memory/note, and submitter name, keeps the temporary marker visible, clears the photo input, and shows a clear error message |
| F17 | If photo upload succeeds but pin insert fails, the uploaded file must be deleted before the user is shown the final failure state so orphaned files do not accumulate in Storage |
| F18 | The app must treat the user's unique name as their account identity |
| F19 | The app must prevent duplicate names from being created as new accounts |
| F20 | Every pin must be associated with the name of the user who created it |
| F21 | The app must allow deletion of a pin only when the current active name matches that pin's owner name |
| F22 | The app must support deletion of both new pins and legacy pins |
| F23 | The delete action must require an explicit confirmation step before permanent deletion |
| F24 | Deleting a pin must permanently remove the pin record |
| F25 | If the pin has a stored photo, deleting the pin must also permanently remove that photo from storage |
| F26 | Users who do not own a pin must not see or be able to use the delete action for that pin |
| F27 | If deletion fails at any step, the pin must remain visible and the user must receive a clear failure message |
| F28 | When a user selects a photo in the Add Pin modal, the UI must clearly show that a photo is selected and display an inline preview before save |
| F29 | When a saved pin has a real photo, tapping that photo in the view modal must open a full-screen viewer that shows the full image instead of cropping it |
| F30 | Pin placement is controlled only by the tapped map coordinates; the typed place name is descriptive text and does not geocode or reposition the pin |

---

## 2. NON-FUNCTIONAL REQUIREMENTS

| ID | Requirement |
|----|-------------|
| N1 | Mobile-first design — all touch targets minimum 44px |
| N2 | Works on iOS Safari and Android Chrome |
| N3 | Single-page app — zero build tools, zero frameworks |
| N4 | Hosted on GitHub Pages, deployed from `main` branch root |
| N5 | Warm vintage scrapbook visual theme (cream, sage/rose, dark brown, serif headings) |
| N6 | Map tiles muted/desaturated so pins are the visual focus |
| N7 | Modals occupy most of the screen on mobile and are thumb-friendly |
| N8 | Page must feel usable within the time the splash screen is displayed (tiles + pins load in background) |
| N9 | The ownership model is trust-based and intentionally lightweight for a small known group |
| N10 | The delete confirmation must clearly state that the action is permanent |
| N11 | The delete flow must work on mobile without requiring complex account setup |
| N12 | Saved photos should remain visually crisp enough for a full-screen viewer; the app must not deliberately crop them in the view flow |

---

## 3. CONSTRAINTS

| ID | Constraint |
|----|------------|
| C1 | No Node.js, npm, Vite, Webpack, or any build tools |
| C2 | No React, Vue, Angular, or any JS framework |
| C3 | Supabase free tier only |
| C4 | GitHub Pages free tier only |
| C5 | Only anon public key exposed in frontend code — service role key never touches frontend |
| C6 | No UPDATE from frontend; DELETE is allowed only for the current pin owner after confirmation |
| C7 | Photo uploads: jpeg/png/webp only, 5MB max (enforced at Storage level, validated client-side too) |
| C8 | No password, email, or full auth system in this phase; ownership is based on unique name matching |
| C9 | File structure: `index.html`, `css/style.css`, `js/app.js`, `manifest.json`, `sw.js`, `assets/` |
| C10 | Supabase JS client v2 loaded via CDN `<script>` tag — no npm install |
| C11 | Ownership enforcement is lightweight and trust-based, not strong identity verification |
| C12 | Delete must remain permanent; no trash bin, restore flow, or soft delete in this phase |
| C13 | Name-based account creation and reuse must stay simple enough for a small trusted group |
| C14 | Place name input is not a geocoding/search field in this phase |

---

## 4. AMBIGUITIES — ALL RESOLVED

| ID | Question | Decision |
|----|----------|----------|
| A1 | Initial map view | Full world view |
| A2 | Legacy pin styling | All pins same style; unseen/seen distinction applies to ALL new pins (F13) |
| A3 | App name | **Breadcrumbs** |
| A4 | Splash message | "Remember that one time..." |
| A5 | PWA icon | Map placeholder icon |
| A6 | "Manual resubmit" after failed submit | No automatic retry; keep modal open; preserve typed text fields; clear photo input; user must tap Save Memory again |
| A7 | Upload succeeds but DB insert fails | Delete the uploaded file, then show failure state and require manual resubmission |
| A8 | What is an account? | A unique user name |
| A9 | Must names be unique? | Yes |
| A10 | Can pins be deleted? | Yes |
| A11 | Who can delete a pin? | Only the user whose current name matches the pin owner |
| A12 | Are deletes soft or hard? | Hard delete |
| A13 | Should photo files be deleted too? | Yes |
| A14 | Can legacy pins be deleted? | Yes |
| A15 | Is there a confirmation step? | Yes |
| A16 | Does typing a place name move the pin? | No. The map click sets the coordinates; the place name is only a label |

---

## 5. ACCEPTANCE CRITERIA

| Req | Done When... |
|-----|-------------|
| F1 | Map fills the full browser viewport, tiles load, zoom and pan work on mobile |
| F2 | Splash appears before map interaction is possible; "Start Exploring" dismisses it |
| F3 | Tapping map drops a visible temporary marker and opens the modal |
| F4 | All four fields present in modal; photo input opens camera roll on mobile |
| F5 | Submitting with empty place name shows an error message; note over 1000 chars is blocked |
| F6 | Supabase receives the insert; row appears in Table Editor after submission |
| F7 | New pin marker visible on map within 2 seconds of submission; bounce animation plays |
| F8 | Tapping a pin opens modal with all correct data from that row |
| F9 | Pin rows with null `image_path` show placeholder, not a broken image |
| F10 | Open app on two devices; add pin on one; it appears on the other without refresh |
| F11 | Legacy pins visible on map immediately on load |
| F12 | Chrome on Android shows "Add to Home Screen" prompt; app opens standalone after install |
| F13 | New pins render in bright color; tapping to view shifts them to muted color permanently |
| F14 | Place name and memory counters update live as the user types and stop at the documented max lengths |
| F15 | Simulate upload or insert failure; no automatic retry occurs in the background and the user must explicitly tap Save Memory again to retry |
| F16 | Simulate submit failure; modal stays open, text fields stay filled, photo input is empty, temporary marker remains visible, and an error message is shown |
| F17 | Simulate successful upload followed by insert failure; uploaded file is removed from Storage and no orphan file remains afterward |
| F18 | A user's active name is the identity used for ownership checks |
| F19 | Attempting to create a new duplicate name is blocked with a clear error; using an existing name is treated as reuse of that account |
| F20 | A newly created pin stores the creator's name as owner |
| F21 | A matching owner name can delete the pin; a non-owner cannot |
| F22 | The same delete rules apply to both new and legacy pins |
| F23 | Tapping delete shows a confirmation prompt before any deletion occurs |
| F24 | After confirmed deletion, the pin no longer appears in the app or database |
| F25 | After confirmed deletion of a pin with a photo, the photo no longer exists in storage |
| F26 | Non-owners do not see a working delete control for that pin |
| F27 | If deletion fails, nothing is partially removed without clear handling, and the user sees an error message |
| F28 | Selecting a photo updates the Add Pin modal with a visible selected state and preview before save |
| F29 | Clicking a saved photo opens a full-screen viewer that shows the full image |
| F30 | Saving a pin after clicking Nebraska but typing `Paris` still places the pin in Nebraska |

---

## 6. RISK TIER

**Overall: Tier 2 (High)**

Reasons:
- External API integration (Supabase)
- User-uploaded file handling (Storage)
- Multi-step write flow (upload to Storage, then insert into database)
- Multi-step destructive flow (delete pin and delete associated photo)
- Anonymous authentication flow
- Trust-based name ownership instead of strong identity verification
- Public-facing app with no admin controls — mistakes are hard to undo
- API credentials embedded in frontend code (anon key only, but still requires care)

---

## Tech Stack Reference

| Layer | Technology |
|-------|------------|
| Hosting | GitHub Pages |
| Database / Backend | Supabase (free tier) |
| Map Engine | Leaflet.js + OpenStreetMap tiles |
| Frontend | Vanilla HTML5 / CSS3 / JavaScript |
| Backend Client | Supabase JS v2 via CDN |
| Authentication | Supabase Anonymous Auth |
| Realtime | Supabase Realtime (postgres_changes on `pins`) |
| Storage | Supabase Storage public bucket `pins` |
| Installability | PWA: manifest.json + Service Worker |
