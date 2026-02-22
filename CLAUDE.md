# Vox Development Guidelines

## i18n: No Hardcoded User-Facing Strings

All user-facing text in the Vox app MUST use the i18n system. Never write hardcoded strings in components or main process code.

### Renderer (React components)

```tsx
import { useT } from "../../i18n-context";

export function MyComponent() {
  const t = useT();
  return <h2>{t("section.key")}</h2>;
}
```

For dynamic values: `t("key", { param: value })`

### Main process (tray, dialogs, indicator, notifications)

```typescript
import { t } from "../shared/i18n";

new Notification({ title: t("notification.title"), body: t("notification.body") });
```

### Adding new translations

1. Add the English key to `src/shared/i18n/locales/en.json`
2. Add the same key with translated values to ALL other locale files: `pt-BR.json`, `pt-PT.json`, `es.json`, `fr.json`, `de.json`, `it.json`, `ru.json`, `tr.json`
3. Every locale file must have the exact same set of keys
4. Run `npx vitest run tests/shared/i18n.test.ts` to verify

### Key naming convention

Use dot notation: `section.subsection.key`

Sections: `general.`, `whisper.`, `llm.`, `permissions.`, `shortcuts.`, `tray.`, `indicator.`, `dialog.`, `ui.`, `model.`, `notification.`, `error.`

### What NOT to translate

- Log messages (`console.log`)
- Model names and provider names (OpenAI, DeepSeek, AWS Bedrock, etc.)
- Technical identifiers (CSS classes, IPC channels, config keys)
- Transcribed speech content
- User-entered content (custom prompts)

## Onboarding and Settings Consistency

The onboarding wizard (`src/renderer/components/onboarding/`) and the settings panels (`src/renderer/components/`) share UI components via `src/renderer/components/shared/`, `src/renderer/components/permissions/`, and `src/renderer/components/whisper/`. When modifying settings panels (WhisperPanel, PermissionsPanel, etc.), always check whether the corresponding onboarding step needs the same update — and vice versa. Shared components like `PermissionRow`, `ModelRow`, `RadioGroup`, and the `useWhisperTest` hook exist to keep both surfaces in sync.

## Validation: Run All Linters Before Completing Work

Before claiming any implementation is done, you MUST run all validation commands and confirm they pass:

```bash
npm run typecheck          # TypeScript type checking
npm run lint               # ESLint
npm run lint:css           # Stylelint for CSS/SCSS
npm run check:tokens       # CSS design token validation
npx vitest run             # All tests
```

All five commands must exit with code 0. Do not commit or claim success if any of them fail.

Pipeline tests (`npm run test:pipeline`) are **not** part of the standard validation. They call external LLM APIs (with real cost) and require a separate config file. Never run them automatically — only on explicit user request. See `docs/pipeline-testing.md` for setup.
