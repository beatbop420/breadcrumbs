# Breadcrumbs Session Handoff

Current live site:
- `https://beatbop420.github.io/breadcrumbs/`

Latest pushed photo-investigation code commit:
- `5df3b52` - Simplify photo input accept list to unblock iPhone library selection

Key supporting iPhone/photo commits already in history:
- `5df3b52` - Simplify photo input accept list to unblock iPhone library selection
- `1912e1b` - Allow iPhone HEIC library photo selection
- `e02be9a` - Show photo upload diagnostics
- `664c7d8` - Prevent iPhone photo normalization hangs
- `3dbcad3` - Bypass service worker cache for uploads
- `ddc52f1` - Prefer Cloudinary secure URLs for photos
- `393a8e8` - Use Cloudinary for photo uploads
- `262465c` - Fix iPhone library photo uploads
- `2c37483` - Fix iOS library photo upload — explicit accept types force HEIC→JPEG conversion
- `75de83e` - Fix iOS photo selection not registering after picker closes
- `61d99de` - Fix iOS photo upload — swap button for label, fix hidden input CSS

Current state:
- Phase 0 through Phase 5 review docs are complete locally.
- The app is deployed on GitHub Pages from the `master` branch root.
- New photo uploads go directly to Cloudinary from the browser.
- Supabase still stores pin data and supports legacy Supabase Storage photo paths.
- Cloudinary is already configured with cloud name `drijk2xzu` and upload preset `breadcrumbs_unsigned`.
- The inactive `supabase/` Edge Function draft and temp CLI files were removed.
- Computer browser photo upload works.
- iPhone camera capture from Breadcrumbs works.
- iPhone existing-library photo selection still stalls inside the native Photos picker before Breadcrumbs receives a file; the in-app debug text does not appear in that case.

What was last changed:
- Cloudinary photo display now prefers Cloudinary `secureUrl`.
- Service worker no longer intercepts non-GET upload requests.
- HEIC/HEIF normalization has a timeout and visible diagnostics were added.
- Picker accept values were first broadened to include HEIC/HEIF, then simplified back to `image/*` to reduce iOS picker conversion constraints; iPhone library selection still needs retesting after the latest change.

Next likely task:
- Investigate iPhone existing-library selection before the web page receives a `change` event.
- Retest the current simple `accept="image/*"` library picker on iPhone Safari.
- Consider splitting the UI into separate `Take Photo` and `Choose From Library` inputs so iOS gets clearer picker intent.

Notes:
- the trust-model/server-policy waiver remains accepted for trusted-family use
- the site may take a short time to refresh after future pushes because GitHub Pages rebuilds in the background
