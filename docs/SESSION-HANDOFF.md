# Breadcrumbs Session Handoff

Current live site:
- `https://beatbop420.github.io/breadcrumbs/`

Latest local saved commit:
- `8bfa748` - Fix edit flow cleanup and refresh review docs

Key supporting iPhone/photo commits already in history:
- `2c37483` - Fix iOS library photo upload — explicit accept types force HEIC→JPEG conversion
- `75de83e` - Fix iOS photo selection not registering after picker closes
- `61d99de` - Fix iOS photo upload — swap button for label, fix hidden input CSS

Current state:
- Phase 0 through Phase 5 review docs are complete locally.
- The app is deployed on GitHub Pages from the `master` branch root.
- The local repo contains fixes that are not live until the next push.
- iPhone photo upload now depends on explicit MIME accept types, native label/input activation, and MIME-based storage naming/content types.
- The public site can open offline on a device after it has loaded once online.

What was last changed:
- photo upload/storage helpers were deduplicated
- storage paths now prefer `file.type` over filename extension
- stale closeout notes were refreshed
- the architecture doc was trimmed back to the approved current-state summary

Next likely task:
- push the latest local changes
- verify the rebuilt Pages URL on iPhone Safari/home-screen PWA and Android Chrome

Notes:
- the trust-model/server-policy waiver remains accepted for trusted-family use
- the site may take a short time to refresh after pushes because GitHub Pages rebuilds in the background
