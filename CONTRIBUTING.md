# Contributing to Vox

Thanks for your interest in contributing to Vox! Here's how to get started.

## Development setup

```bash
git clone https://github.com/app-vox/vox.git
cd vox
npm install
npm run dev
```

## Before submitting a PR

Run all checks locally:

```bash
npm run typecheck
npm run lint
npm test
```

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```text
type(scope): description
```

Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf`, `style`

Examples:
- `feat(audio): add noise gate filter`
- `fix(shortcuts): prevent double-fire on toggle`
- `refactor(llm): extract retry logic`

## Pull requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes
4. Ensure all checks pass
5. Open a pull request against `main`

Keep PRs focused — one feature or fix per PR.

## Code quality & security

[MegaLinter](https://megalinter.io) runs automatically on every pull request and push to `main`. It is a **required check** — PRs cannot merge if it fails.

### What it checks

- **Security**: secret detection (Gitleaks, Secretlint), vulnerability scanning (Trivy)
- **Code quality**: ESLint (JS/TS), JSON validation, YAML linting, Markdown linting

### Running locally

```bash
npx mega-linter-runner --flavor javascript
```

Reports are saved to the `megalinter-reports/` directory (git-ignored).

## Dev Panel (dev-only)

When running `npm run dev`, a **Dev Panel** tab appears in the sidebar. It displays all runtime states and lets you override them (fake an update, revoke permissions, simulate offline, etc.) to test UI behavior without real conditions. Overrides are automatically cleared on app startup.

This panel is **completely excluded from production builds**. All entry points use `import.meta.env.DEV` guards with `React.lazy()` dynamic imports, so Vite's dead-code elimination removes the entire module tree (panel, store, styles) during `npm run build`. Zero dev bytes ship to users.

If you add new dev-only code, follow the same pattern: gate behind `import.meta.env.DEV` and use `lazy(() => import(...))` — never static imports.

When introducing a new piece of shared state (used across multiple components), add it to the Dev Panel in `src/renderer/components/dev/DevPanel.tsx`. If the state is renderer-side and affects the UI, also add an override for it in the `DevOverrides` interface (`src/renderer/stores/dev-overrides-store.ts`) and wire it into the consuming component via `useDevOverrideValue`.

## Code style

- TypeScript strict mode
- Code, comments, and documentation in English
- No unused imports or variables (enforced by ESLint)

## Dependency management

[Renovate Bot](https://docs.renovatebot.com/) automatically manages npm dependency updates. It creates pull requests for outdated packages, grouped by category (Electron, React, AWS SDK, etc.).

- **Dependency Dashboard**: A GitHub issue tracks all pending, rate-limited, and ignored updates.
- **Automerge**: Patch updates and low-risk devDependency changes merge automatically when CI passes.
- **Native modules** (`whisper-node`, `koffi`, `uiohook-napi`): These are never automerged and include a manual testing checklist — verify audio recording, shortcuts, and builds on both arm64 and x64 Mac.
- **Major updates**: Always require manual review and are separated into individual PRs.

See `renovate.json` for the full configuration.

## Reporting bugs

Use the [Bug Report](https://github.com/app-vox/vox/issues/new?template=bug_report.md) issue template.

## Requesting features

Use the [Feature Request](https://github.com/app-vox/vox/issues/new?template=feature_request.md) issue template.
