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

```
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

## Code style

- TypeScript strict mode
- Code, comments, and documentation in English
- No unused imports or variables (enforced by ESLint)

## Reporting bugs

Use the [Bug Report](https://github.com/app-vox/vox/issues/new?template=bug_report.md) issue template.

## Requesting features

Use the [Feature Request](https://github.com/app-vox/vox/issues/new?template=feature_request.md) issue template.
