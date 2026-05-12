# Breadcrumbs — Security Review
**Date:** 2026-05-11
**Status:** COMPLETE WITH WAIVERS

## Checklist

| Item | Status | Notes |
|------|--------|-------|
| Service role key kept out of frontend | Pass | Frontend uses only the anon public key |
| Input validation for place/note/name/coords/photo | Pass | Client-side validation present in `js/data.js` |
| HTML escaping for displayed pin content | Pass | `buildSafePinHtml()` escapes output text |
| RLS enabled on data tables | Pass | Live fixes preserved RLS; policies were adjusted, not removed |
| Anonymous auth flow understood | Pass | Anonymous sessions resolve to the `authenticated` role |
| Public read scope limited to intended data | Pass | `pins` read policy allows `anon` and `authenticated` only |
| Delete restricted to owned pins in app flow | Pass | UI checks owner before enabling delete |
| Storage MIME and size limits enforced | Pass | Bucket config and client validation restrict to jpeg/png/webp, 5MB |
| Dangerous code patterns | Pass | `npm run security:check` passed |
| Strong identity proof for ownership | Waived | Product intentionally uses lightweight trust-based name ownership |
| Geocoding/location spoof prevention | Waived | Product intentionally allows freeform place names with click-based coordinates |

## Residual Risk

- Name-based ownership is intentionally weak and only suitable for a small trusted group.
- Public photo URLs are expected product behavior.
- Users can label a clicked location with any text; this is a product decision, not a bug.
