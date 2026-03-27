# Vox Development Guidelines

## Code Search: Use ChunkHound CLI

**CRITICAL: ALWAYS start with ChunkHound before reading any files.** This is not optional. ChunkHound returns pre-chunked, line-referenced results and is orders of magnitude faster than scanning files.

### Decision Tree

```
User asks a question about code
    ↓
Is it an architectural/conceptual question?
    → YES: Use `chunkhound research "question"`
    → NO: Continue below
    ↓
Is it about finding a specific pattern/class/function?
    → YES: Use `chunkhound search --regex "pattern"`
    → NO: Continue below
    ↓
Is it about finding conceptually related code?
    → YES: Use `chunkhound search "semantic query"`
    ↓
After getting results → Read ONLY the specific files/lines returned
```

### When to Use Each Command

**For architectural questions**, use semantic search with broad queries - it returns ranked, relevant chunks you can read to understand patterns:
```bash
# ✅ User asks: "explain the cross-platform strategy"
chunkhound search "cross-platform architecture platform-specific modules" --path-filter "src/main/platform"

# ✅ User asks: "how does recording work?"
chunkhound search "audio recording pipeline microphone capture"

# ✅ User asks: "what patterns are used for X?"
chunkhound search "LLM provider abstraction factory pattern"
```

**Note:** `chunkhound research` (deep multi-hop research) requires large-context LLMs and is fragile with local models. For deep research, use MCP mode instead — `.mcp.json` is versioned and always active, giving ChunkHound access to Claude Code for synthesis. Just use the `research` MCP tool directly.

**`chunkhound search`** - Semantic search for related code:
```bash
# ✅ Find all authentication-related code
chunkhound search "authentication logic" --path-filter "src/"

# ✅ Find error handling patterns
chunkhound search "error handling retry logic"
```

**`chunkhound search --regex`** - Exact pattern matching:
```bash
# ✅ Find all Service classes
chunkhound search --regex "class \w+Service"

# ✅ Find all interfaces starting with I
chunkhound search --regex "interface I\w+" --path-filter "src/main/"

# ✅ Find function definitions
chunkhound search --regex "function \w+\("
```

### Configuration

ChunkHound config lives in `.chunkhound.json`:

```json
{
  "embedding": {
    "provider": "openai",
    "base_url": "http://localhost:11434/v1",
    "model": "nomic-embed-text"
  }
}
```

**Ollama setup** (macOS only, for semantic search):

```bash
make embeddings        # starts Ollama + pulls nomic-embed-text if needed + re-indexes
make embeddings-stop   # stops Ollama
```

If Ollama isn't available, ChunkHound falls back to regex-only search (still useful!).

### Why CLI over MCP?

- **Faster**: No MCP server overhead or IPC serialization
- **Transparent**: You see exactly what commands run in the conversation
- **Flexible**: Easy to adjust flags, pagination, filters dynamically
- **Simpler**: One less moving part, no process locks

**MCP mode**: `.mcp.json` is versioned and always active — ChunkHound's MCP server is connected automatically in every Claude Code session. Use it for deep `research` capability (multi-hop synthesis with large context), where ChunkHound uses Claude Code as its LLM for complex architectural analysis.

### Examples of What NOT to Do

❌ **Wrong**: User asks "explain the platform module" → immediately read files
✅ **Right**: `chunkhound research "How does the platform module work?"`

❌ **Wrong**: User asks "find all LLM providers" → use Glob/Grep
✅ **Right**: `chunkhound search "LLM provider implementations"`

❌ **Wrong**: Search for `class AudioRecorder` → use Grep
✅ **Right**: `chunkhound search --regex "class AudioRecorder"`

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

## Platform-Specific Code: Use the Platform Module

All platform-specific logic MUST live in `src/main/platform/`. Never use `process.platform` checks (e.g., `if (process.platform === "darwin")`) scattered across the codebase. Instead, add the behavior to the appropriate platform module and consume it through the exported interface.

Platform modules: `PasterModule`, `PermissionsModule`, `WhisperModule`, `DisplayModule` — each with `darwin/` and `win32/` implementations resolved automatically at `src/main/platform/index.ts`.

To add platform-specific behavior:

1. Add the property or method to the interface in `src/main/platform/types.ts`
2. Implement it in `src/main/platform/darwin/` and `src/main/platform/win32/`
3. Import and use the module from `src/main/platform` in the consumer

## Onboarding and Settings Consistency

The onboarding wizard (`src/renderer/components/onboarding/`) and the settings panels (`src/renderer/components/`) share UI components via `src/renderer/components/shared/`, `src/renderer/components/permissions/`, and `src/renderer/components/whisper/`. When modifying settings panels (WhisperPanel, PermissionsPanel, etc.), always check whether the corresponding onboarding step needs the same update — and vice versa. Shared components like `PermissionRow`, `ModelRow`, `RadioGroup`, and the `useWhisperTest` hook exist to keep both surfaces in sync.

## Pull Request Labels

When creating a pull request with `gh pr create`, you MUST apply labels using the `--label` flag. Derive labels from the conventional commit type in the branch name or commit messages:

| Commit type | Label(s) |
|-------------|----------|
| `feat`      | `feature` |
| `fix`       | `bug` |
| `docs`      | `documentation` |
| `chore`     | `dependencies` (if deps-related), or omit |
| `ci`        | omit (no matching label) |
| `test`      | `needs-testing` |
| `refactor`  | `enhancement` |
| `perf`      | `enhancement` |
| `style`     | `ui/ux` |
| `security`  | `security` |

Additionally, apply **scope-based labels** when the commit scope matches:

| Scope pattern | Label |
|---------------|-------|
| `ui`, `ux`, `design`, `css` | `ui/ux` |
| `electron` | `electron` |
| `openai` | `provider:openai` |
| `deepseek` | `provider:deepseek` |
| `anthropic` | `provider:anthropic` |
| `litellm` | `provider:litellm` |
| `log`, `logging` | `logging` |
| `macos`, `mac` | `platform:macos` |
| `windows`, `win` | `platform:windows` |
| `linux` | `platform:linux` |

**Example:**

```bash
# feat(ui): add dark mode toggle → labels: feature, ui/ux
gh pr create --title "feat(ui): add dark mode toggle" --label "feature" --label "ui/ux" ...

# fix(deepseek): handle timeout errors → labels: bug, provider:deepseek
gh pr create --title "fix(deepseek): handle timeout errors" --label "bug" --label "provider:deepseek" ...
```

If no labels match, do not force a label — some PRs (e.g., `ci` changes) may have none.

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

## Issue Tracking

Bugs, feature requests, and technical work are tracked as GitHub Issues in **this repo**. When creating issues, always add them to the organization's public project board (the one linked to `app-vox/vox`).

Business, strategy, and roadmap issues are tracked in a private internal repository. Never reference or link to it in any public context (issues, PRs, commits, code comments, or docs).
