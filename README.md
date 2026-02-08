# Vox Landing Page

This is the `gh-pages` branch containing the landing page for Vox, published at [https://app-vox.github.io/vox/](https://app-vox.github.io/vox/).

## Structure

- `index.html` - Main landing page
- `style.css` - Styles with dark/light theme support
- `script.js` - Interactive features (theme toggle, GitHub API, animations)
- `assets/` - Images and static assets

## Development

To preview locally:

```bash
open index.html
```

Or use a local server:

```bash
python3 -m http.server 8000
# Visit http://localhost:8000
```

## Deployment

Changes to this branch are automatically published to GitHub Pages:

```bash
git add .
git commit -m "Update landing page"
git push origin gh-pages
```

## Features

- Responsive design (mobile-first)
- Dark/light theme toggle with localStorage persistence
- GitHub star count via API
- Smooth scroll animations
- Full keyboard navigation support
- Optimized for accessibility

## Browser Support

Modern browsers only (Safari 14+, Chrome 90+, Firefox 88+)
