# Breadcrumbs — Phase 5 Traceability And Audit
**Date:** 2026-05-28

## High-Signal Findings

- Latest pushed photo-investigation code milestone is `5df3b52`.
- The biggest current drift was stale documentation after the Cloudinary upload pivot, not core runtime behavior.
- The active new-photo path is Cloudinary direct upload from the browser; Supabase stores pin rows and still supports legacy storage paths.
- Computer browser upload and iPhone camera capture work; iPhone existing-library selection still stalls before the app receives a file.
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
- Follow-up work added secure-url display, service-worker upload bypass, HEIC/HEIF timeout fallback, and visible upload diagnostics.
- Local automated verification passes after the Cloudinary follow-up work.
- Cloudinary values are already configured in `index.html` and `js/config.local.js`.
- Remaining manual QA is focused on iPhone existing-library selection and Android Chrome upload.
