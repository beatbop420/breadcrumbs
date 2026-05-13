# Breadcrumbs

Breadcrumbs is a small family memory map app. It shows a world map, lets a user drop a pin on a clicked location, attach a short note and optional photo, and save it to Supabase. Saved memories can be opened later, marked as seen, deleted by their owner, and viewed in a full-screen photo viewer when a real photo exists.

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

## Tests

```bash
cd /home/petra/Desktop/breadcrumbs
npm test
npm run check:syntax
npm run lint
npm run security:check
```

## Deploy

This project is deployed as a static site on GitHub Pages.

1. Push the repo to GitHub.
2. In the GitHub repo settings, open `Pages`.
3. Set the source to the `main` branch root.
4. Save the setting.
5. Wait for GitHub Pages to publish the site.

## Environment Variables

Breadcrumbs does not use shell environment variables for runtime configuration.

| Name | Purpose | Required | Default |
|---|---|---|---|
| `window.BREADCRUMBS_CONFIG.supabaseUrl` | Supabase project URL | Yes, at runtime | None |
| `window.BREADCRUMBS_CONFIG.supabaseAnonKey` | Supabase anonymous public key | Yes, at runtime | None |

For local testing, the same values can be provided in `js/config.local.js`.

## Known Limitations

- Ownership is name-based and trust-based, which is fine for a small family group but not for hostile users.
- The typed place name is just a label. The pin still goes where the map is clicked.
- GitHub Pages hosting is still the public frontend deployment target.
- Legacy pins are not verifiable in the live database right now because there are no `is_legacy = true` rows present.
- Android Chrome installability was not fully verified from this laptop/Firefox workflow.
