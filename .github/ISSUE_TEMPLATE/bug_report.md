---
name: Bug Report
about: Report a bug or unexpected behavior
title: ""
labels: bug
---

## Description

A clear description of the bug.

## Steps to reproduce

1. ...
2. ...
3. ...

## Expected behavior

What should happen.

## Actual behavior

What actually happens.

## Environment

- OS / version:
- Vox version:
- Whisper model:
- LLM provider: Foundry / Bedrock / OpenAI / DeepSeek / Anthropic / LiteLLM / Custom / None

## Code Standards Checklist

> Before submitting a fix, ensure the following are addressed:

- [ ] **i18n** — All user-facing strings use the translation system (`useT()` / `t()`). New keys added to `en.json` **and all other locale files**.
- [ ] **Dev Panel state** — If this fix changes or reveals internal state, consider exposing it in the Dev Panel (#157) for easier future debugging.
- [ ] **CSS** — Use CSS Modules with CSS custom properties (variables) for colors, spacing, and theming. No hardcoded hex/rgb values.
- [ ] **SVGs** — SVG assets live in their own files (not inlined in TSX). Import them as components or image sources.
- [ ] **No hardcoded strings** — Log messages are fine, but anything the user sees must go through i18n.
