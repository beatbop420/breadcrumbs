# Breadcrumbs — Phase 5 Traceability And Audit
**Date:** 2026-05-28

## High-Signal Findings

- The current local saved milestone is `c113379`.
- The biggest current drift was stale documentation after the Cloudinary upload pivot, not core runtime behavior.
- The active new-photo path is Cloudinary direct upload from the browser; Supabase stores pin rows and still supports legacy storage paths.
- The old Supabase Edge Function draft was removed and should not be treated as the current plan.
- The biggest standing security risk is still the trust-based identity and broad server-side delete/storage policy model.

## Traceability Snapshot

| Item | Where It Landed |
|---|---|
| Review scope lock | Requirements Lock Document |
| Current code structure and verification plan | Architecture Document |
| Actual command outputs and confirmed fixes | Verification Report |
| Trust-model and policy waivers | Security Review |
| Scope, consistency, and packaging closeout | Final Review |

## Follow-Up Closeout Notes

- Edit-flow cleanup and regression coverage remain in place.
- The photo upload path now uses Cloudinary for new uploads and stores structured Cloudinary references in Supabase.
- Local automated verification passes after the Cloudinary follow-up work.
- Cloudinary values are already configured in `index.html` and `js/config.local.js`.
- Remaining manual QA is real-device upload verification on iPhone and Android.
