# Vox Landing Page Guidelines

## Branch

This is the `gh-pages` branch — a static site served at https://app-vox.github.io/vox/. It is completely separate from the main app codebase.

## PostHog Analytics

PostHog is configured with the same project used by the desktop app, using the `posthog-js` browser SDK loaded via CDN snippet in `index.html`.

- **API Key**: `phc_xKMWJw3NXHbfxhW10c3QG3nKTFRGio4PtVeJVfo0lNu`
- **Host**: `https://us.i.posthog.com`
- **Person profiles**: `anonymous` (no PII)
- **Auto-capture**: pageview and pageleave enabled

### Adding events

Every new interactive element (button, link, toggle) must have a PostHog event. Use the `trackEvent` helper in `script.js`:

```js
trackEvent('event_name', { key: 'value' });
```

### Naming conventions

- Use `snake_case` for event names
- Be descriptive: `download_click`, `github_click`, `theme_toggle`
- Include context via params: `{ platform: 'macos' }`, `{ location: 'header' }`
- Keep consistent with the desktop app event naming in `src/main/analytics/`

### Current tracked events

| Event | Params | Element |
|---|---|---|
| `download_click` | `platform` | Download for macOS button |
| `github_click` | `location` | GitHub stars badge, Star on GitHub button |
| `language_switch` | `language` | Language selector |
| `theme_toggle` | `theme` | Dark/light toggle |
| `footer_link_click` | `label` | Footer nav links (Docs, GitHub, MIT License) |

## i18n

All user-facing text uses the i18n system in `i18n.js`. When adding new text, add keys to all locale objects.

## Structure

- `index.html` — Landing page markup
- `style.css` — Styles with dark/light theme support
- `script.js` — Interactive features, animations, PostHog tracking
- `i18n.js` — Internationalization (9 languages)
- `assets/` — Images and static assets
