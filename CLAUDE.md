# Vox Landing Page Guidelines

## Branch

This is the `gh-pages` branch — a static site served at https://app-vox.github.io/vox/. It is completely separate from the main app codebase.

## Google Analytics (GA4)

GA4 is configured with measurement ID `G-38TC6X62Z3`.

### Adding events

Every new interactive element (button, link, toggle) must have a GA event. Use the `trackEvent` helper in `script.js`:

```js
trackEvent('event_name', { key: 'value' });
```

### Naming conventions

- Use `snake_case` for event names
- Be descriptive: `download_click`, `github_click`, `language_switch`
- Include context via params: `{ platform: 'macos' }`, `{ location: 'header' }`, `{ language: 'pt-BR' }`

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
- `script.js` — Interactive features, animations, GA tracking
- `i18n.js` — Internationalization (9 languages)
- `assets/` — Images and static assets
