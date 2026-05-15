# Breadcrumbs

Breadcrumbs is a small family memory map app. It shows a world map, lets a user drop a pin, attach a short note and optional photo, and save it to Supabase. Typed place names can also trigger best-effort geocoding that moves the temporary marker while the user is filling out the form. Saved memories can be opened later, marked as seen, edited by their owner, deleted by their owner in the UI, and viewed in a full-screen photo viewer when a real photo exists. The live site is published on GitHub Pages and can still open offline on a device after that device has loaded it once online.

New photo uploads now go directly to Cloudinary from the browser. Supabase still stores the pin data, but Cloudinary handles the image file itself.

## Live Site

```text
https://beatbop420.github.io/breadcrumbs/
```

## Install

```bash
cd /home/petra/Desktop/breadcrumbs
npm install
```

## Run

```bash
cd /home/petra/Desktop/breadcrumbs
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000
```

For the public live site, open the GitHub Pages URL above.

## Tests

```bash
cd /home/petra/Desktop/breadcrumbs
npm test
npm run check:syntax
npm run lint
npm run security:check
npm run audit:deps
```

## Deploy

This project is deployed as a static site on GitHub Pages.

1. Create a Cloudinary account.
2. Create an unsigned upload preset for this project.
3. Put the Cloudinary values into `window.BREADCRUMBS_CONFIG` in `index.html` or `js/config.local.js`.
4. Push the repo to GitHub.
5. In the GitHub repo settings, open `Pages`.
6. Set the source to the `master` branch root.
7. Save the setting.
8. Wait for GitHub Pages to publish the site.

## Environment Variables

Breadcrumbs does not use shell environment variables for runtime configuration. The public runtime config is embedded in `index.html` for GitHub Pages, and local development can still use `js/config.local.js` if needed.

| Name | Purpose | Required | Default |
|---|---|---|---|
| `window.BREADCRUMBS_CONFIG.supabaseUrl` | Supabase project URL | Yes, at runtime | None |
| `window.BREADCRUMBS_CONFIG.supabaseAnonKey` | Supabase anonymous public key | Yes, at runtime | None |
| `window.BREADCRUMBS_CONFIG.cloudinaryCloudName` | Cloudinary cloud name for direct uploads and image URLs | Yes, for new photo uploads | Empty string |
| `window.BREADCRUMBS_CONFIG.cloudinaryUploadPreset` | Cloudinary unsigned upload preset | Yes, for new photo uploads | Empty string |

For local testing, the same values can be provided in `js/config.local.js`.

## Known Limitations

- Ownership is name-based and trust-based, which is fine for a small family group but not for hostile users.
- The typed place name can move the temporary marker through best-effort geocoding. It is not guaranteed and depends on network availability.
- The public site needs one online load on a device before offline caching is useful on that device.
- Cloudinary cleanup is not wired yet, so failed saves, later pin deletes, or photo replacements may leave unused remote files behind.
- Legacy pins are not verifiable in the live database right now because there are no `is_legacy = true` rows present.
- Android Chrome installability was not fully verified from this laptop/Firefox workflow.
