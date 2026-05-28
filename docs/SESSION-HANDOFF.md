# Breadcrumbs Session Handoff

Current live site:
- `https://beatbop420.github.io/breadcrumbs/`

Latest local saved commit:
- `c113379` - Add key files section to README for code review orientation

Key supporting iPhone/photo commits already in history:
- `393a8e8` - Use Cloudinary for photo uploads
- `262465c` - Fix iPhone library photo uploads
- `2c37483` - Fix iOS library photo upload — explicit accept types force HEIC→JPEG conversion
- `75de83e` - Fix iOS photo selection not registering after picker closes
- `61d99de` - Fix iOS photo upload — swap button for label, fix hidden input CSS

Current state:
- Phase 0 through Phase 5 review docs are complete locally.
- The app is deployed on GitHub Pages from the `master` branch root.
- The local `master` branch is up to date with `origin/master`.
- New photo uploads now go directly to Cloudinary from the browser.
- Supabase still stores pin data and supports legacy Supabase Storage photo paths.
- Cloudinary is already configured with cloud name `drijk2xzu` and upload preset `breadcrumbs_unsigned`.
- The public site can open offline on a device after it has loaded once online.
- The inactive `supabase/` Edge Function draft and temp CLI files were removed.

What was last changed:
- README code-review orientation was added
- Cloudinary upload support was added and configured
- iPhone photo upload fixes remain in history
- closeout notes were refreshed to match the Cloudinary path

Next likely task:
- verify real photo upload on iPhone Safari/home-screen PWA and Android Chrome
- continue real-device upload verification now that the inactive Edge Function draft has been removed

Notes:
- the trust-model/server-policy waiver remains accepted for trusted-family use
- the site may take a short time to refresh after future pushes because GitHub Pages rebuilds in the background
