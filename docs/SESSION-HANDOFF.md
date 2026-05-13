# Breadcrumbs Session Handoff

Current live site:
- `https://beatbop420.github.io/breadcrumbs/`

Latest saved commits:
- `058ab48` - Add iPhone and Android install icons
- `2fc04a3` - Add phase 5 audit docs and README
- `590700c` - Close Phase 4 security review for family use
- `7a41a52` - Inline public runtime config for Pages
- `29b15cf` - Add session handoff note
- `ac5aec1` - Update docs for live site and offline behavior

Current state:
- Phase 0 through Phase 4 are complete in git.
- The app is deployed on GitHub Pages from the `master` branch root.
- iPhone install support was added with `apple-touch-icon` and Apple web app meta tags.
- Android install support is present through the manifest and PNG icons.
- The public site can open offline on a device after it has loaded once online.

What was last changed:
- README updated for the live site and offline behavior.
- Phase 5 traceability/audit doc updated.
- Requirements, architecture, verification, security, and final review docs were refreshed to match the live site.

Next likely task:
- Verify the live Pages URL on iPhone Safari and Android Chrome.
- If anything still fails, update the deployment or PWA config and re-push.

Notes:
- The repository currently has no uncommitted changes.
- The site may take a short time to refresh after pushes because GitHub Pages rebuilds in the background.
