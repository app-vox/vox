---
name: Feature Request
about: Suggest a new feature or improvement
title: ""
labels: enhancement
---

## Problem

What problem does this feature solve?

## Proposed solution

How should this work?

## Alternatives considered

Any alternative approaches you've thought of.

## Code Standards Checklist

> Before implementing, ensure the following are considered in the design and implementation:

- [ ] **i18n** — All user-facing strings use the translation system (`useT()` / `t()`). New keys added to `en.json` **and all other locale files**.
- [ ] **Dev Panel state** — If this feature introduces new internal state, consider exposing it in the Dev Panel (#157) for runtime inspection and debugging.
- [ ] **CSS** — Use CSS Modules with CSS custom properties (variables) for colors, spacing, and theming. No hardcoded hex/rgb values.
- [ ] **SVGs** — SVG assets live in their own files (not inlined in TSX). Import them as components or image sources.
- [ ] **No hardcoded strings** — Log messages are fine, but anything the user sees must go through i18n.
- [ ] **Accessibility** — Interactive elements are keyboard-navigable and have appropriate ARIA attributes.
