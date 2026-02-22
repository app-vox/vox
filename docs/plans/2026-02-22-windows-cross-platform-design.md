# Windows Cross-Platform Support — Design

## Problem

Vox was built for macOS. Running on Windows, the app records audio (UI shows recording indicator) but transcription returns empty text ("nothing heard"). Additionally, text pasting, accessibility checks, and permission flows are macOS-only.

## Root Cause

1. **Whisper binary name**: `whisper.ts:17` resolves the binary as `main` — on Windows the compiled binary is `main.exe`.
2. **Text pasting** (`paster.ts`): 327 lines of macOS-only code using koffi to call CoreGraphics, CoreFoundation, and ApplicationServices frameworks.
3. **Permissions** (`ipc.ts`): Inline koffi calls to macOS AXIsProcessTrusted and systemPreferences APIs.
4. **Window behavior** (`home.ts`): macOS-specific `titleBarStyle`, close-to-hide, and menu roles.

## Architecture: Platform Module Pattern

A `src/main/platform/` directory with subdirectories per OS. A single `index.ts` routes to the correct implementation at runtime via `require(./${process.platform}/module)`. Business logic never sees `process.platform`.

```
src/main/platform/
  index.ts              — exports { paster, permissions }
  types.ts              — PasterModule, PermissionsModule interfaces
  utils.ts              — applyCase, stripTrailingPeriod (platform-independent)
  darwin/
    paster.ts           — current paster.ts (koffi + CoreGraphics + AX API)
    permissions.ts      — AXIsProcessTrusted, systemPreferences
  win32/
    paster.ts           — user32.dll via koffi (SendInput, GetForegroundWindow)
    permissions.ts      — always-granted accessibility, Electron microphone API
```

### Loader (index.ts)

```typescript
import type { PasterModule, PermissionsModule } from "./types";

const os = process.platform;
export const paster: PasterModule = require(`./${os}/paster`);
export const permissions: PermissionsModule = require(`./${os}/permissions`);
```

### Shared Interface (types.ts)

```typescript
export interface PasteOptions {
  lowercaseStart?: boolean;
}

export interface PasterModule {
  isAccessibilityGranted(): boolean;
  hasFocusedElement(): boolean;
  hasActiveTextField(): boolean;
  pasteText(text: string, copyToClipboard?: boolean, options?: PasteOptions): boolean;
}

export interface PermissionsModule {
  getAccessibilityStatus(): boolean | string;
  getMicrophoneStatus(): string;
  requestMicrophoneAccess(): Promise<boolean>;
  openAccessibilitySettings(): void;
}
```

## Change Details

### 1. Whisper binary name (audio/whisper.ts)

One-line fix:

```typescript
const ext = process.platform === "win32" ? ".exe" : "";
const WHISPER_BIN = path.join(WHISPER_CPP_DIR, `main${ext}`);
```

### 2. Text pasting → platform/darwin/paster.ts + platform/win32/paster.ts

**macOS** (darwin/paster.ts): Extract current `paster.ts` as-is. Loads CoreGraphics, CoreFoundation, ApplicationServices via koffi. Uses CGEventPost for keyboard simulation, osascript for frontmost PID, AX API for focused element detection.

**Windows** (win32/paster.ts): Uses koffi (already ships win32 binaries) to call:
- `user32.dll` → `SendInput()` for Ctrl+V keyboard simulation (replaces CGEventPost)
- `user32.dll` → `GetForegroundWindow()` + `GetWindowThreadProcessId()` (replaces osascript)
- `user32.dll` → `GetGUIThreadInfo()` for focused element detection (replaces AX API)

Shared utilities (`applyCase`, `stripTrailingPeriod`) move to `platform/utils.ts`.

### 3. Permissions → platform/darwin/permissions.ts + platform/win32/permissions.ts

**macOS**: Extract from ipc.ts lines 217-257. Uses koffi + AXIsProcessTrusted, systemPreferences.getMediaAccessStatus, x-apple.systempreferences URL.

**Windows**: Accessibility is always granted (no permission gate on Windows). Microphone uses Electron's `systemPreferences.getMediaAccessStatus("microphone")` which works on Windows. Settings opened via `ms-settings:privacy-microphone`.

### 4. Window behavior (windows/home.ts, ipc.ts)

- `titleBarStyle`: Use `"hiddenInset"` on macOS, `"hidden"` on Windows.
- Close-to-hide: On macOS, hide to dock. On Windows, hide to system tray (same behavior, different UX expectation — no changes needed since tray already exists).
- Launch at login: Remove `darwin` guard in ipc.ts:60. Electron's `setLoginItemSettings` works on both platforms.
- Menu roles: `services`, `hide`, `hideOthers`, `unhide` are macOS-only. Wrap in platform check or let Electron ignore them (they're no-ops on Windows).
- Accessibility dialog (app.ts:182-199): Use `permissions.openAccessibilitySettings()` from the platform module instead of hardcoded `x-apple.systempreferences:` URL.

## What Stays Unchanged

- `audio/recorder.ts` — Web Audio API (getUserMedia), cross-platform
- `shortcuts/manager.ts` — uiohook-napi ships win32 prebuilt binaries
- `tray.ts` — Electron Tray, cross-platform
- `pipeline.ts` — orchestrator, no platform code
- All renderer code — React
- All LLM providers — HTTP API calls
- Config, history, models, analytics, updater — pure JS/Electron APIs
- postinstall — `make -C whisper.cpp main` compiles `main.exe` on Windows via MinGW

## Testing

- Existing `applyCase`/`stripTrailingPeriod` tests stay as-is (moved to test platform/utils)
- Platform modules tested via mocked koffi calls
- Manual testing: record → transcribe → paste on both macOS and Windows
