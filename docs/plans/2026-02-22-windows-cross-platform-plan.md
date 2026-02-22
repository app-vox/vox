# Windows Cross-Platform Support — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Vox work on Windows without breaking macOS, using a platform module pattern that keeps all OS-specific code isolated.

**Architecture:** A `src/main/platform/` directory with `darwin/` and `win32/` subdirectories. Each exports the same interface. A single `index.ts` routes to the correct implementation at runtime via `require(./${process.platform}/...)`. Business logic never sees `process.platform`.

**Tech Stack:** TypeScript, Electron, koffi (FFI for native APIs), user32.dll (Windows), CoreGraphics/ApplicationServices (macOS)

**Validation commands (run after every task):**
```bash
npm run typecheck
npm run lint
npx vitest run
```

---

### Task 1: Fix whisper binary name for Windows

The root cause of "nothing heard" on Windows. The compiled binary is `main.exe` on Windows but the code looks for `main`.

**Files:**
- Modify: `src/main/audio/whisper.ts:17`

**Step 1: Fix the binary path**

In `src/main/audio/whisper.ts`, change line 17 from:

```typescript
const WHISPER_BIN = path.join(WHISPER_CPP_DIR, "main");
```

to:

```typescript
const WHISPER_BIN = path.join(WHISPER_CPP_DIR, process.platform === "win32" ? "main.exe" : "main");
```

**Step 2: Run validation**

```bash
npm run typecheck
npx vitest run
```

Expected: All pass. No existing tests directly test this path (it requires the Electron `app` module).

**Step 3: Commit**

```bash
git add src/main/audio/whisper.ts
git commit -m "fix(whisper): resolve binary name on Windows (.exe extension)"
```

---

### Task 2: Create platform module scaffolding (types + utils + loader)

Set up the shared interfaces and platform-independent utilities that both darwin and win32 implementations will use.

**Files:**
- Create: `src/main/platform/types.ts`
- Create: `src/main/platform/utils.ts`
- Create: `src/main/platform/index.ts`
- Create: `tests/main/platform/utils.test.ts`

**Step 1: Create the shared types**

Create `src/main/platform/types.ts`:

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

**Step 2: Extract platform-independent utilities**

Move `applyCase` and `stripTrailingPeriod` from `src/main/input/paster.ts` into `src/main/platform/utils.ts`:

```typescript
export function applyCase(text: string, lowercaseStart: boolean): string {
  if (!text) return text;
  if (lowercaseStart) return text[0].toLowerCase() + text.slice(1);
  return text;
}

export function stripTrailingPeriod(text: string): string {
  if (!text.endsWith(".")) return text;
  const words = text.trim().split(/\s+/);
  if (words.length <= 3) return text.slice(0, -1);
  return text;
}
```

**Step 3: Write tests for the utilities**

Create `tests/main/platform/utils.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { applyCase, stripTrailingPeriod } from "../../../src/main/platform/utils";

describe("applyCase", () => {
  it("returns empty string unchanged", () => {
    expect(applyCase("", true)).toBe("");
  });

  it("lowercases first character when lowercaseStart is true", () => {
    expect(applyCase("Hello world", true)).toBe("hello world");
  });

  it("preserves original case when lowercaseStart is false", () => {
    expect(applyCase("Hello world", false)).toBe("Hello world");
  });
});

describe("stripTrailingPeriod", () => {
  it("returns text without trailing period unchanged", () => {
    expect(stripTrailingPeriod("Hello world")).toBe("Hello world");
  });

  it("strips trailing period from short text (3 words or fewer)", () => {
    expect(stripTrailingPeriod("Hello world.")).toBe("Hello world");
    expect(stripTrailingPeriod("One.")).toBe("One");
  });

  it("keeps trailing period for longer text (more than 3 words)", () => {
    expect(stripTrailingPeriod("This is a full sentence.")).toBe("This is a full sentence.");
  });
});
```

**Step 4: Create the platform loader**

Create `src/main/platform/index.ts`:

```typescript
import type { PasterModule, PermissionsModule } from "./types";

const os = process.platform;

export const paster: PasterModule = require(`./${os}/paster`);
export const permissions: PermissionsModule = require(`./${os}/permissions`);

export { applyCase, stripTrailingPeriod } from "./utils";
export type { PasteOptions, PasterModule, PermissionsModule } from "./types";
```

> **Note:** This file will not compile yet — the darwin/ and win32/ modules don't exist. That's expected; we create them in Tasks 3–6.

**Step 5: Run tests for utils only**

```bash
npx vitest run tests/main/platform/utils.test.ts
```

Expected: All 5 tests PASS.

**Step 6: Commit**

```bash
git add src/main/platform/types.ts src/main/platform/utils.ts src/main/platform/index.ts tests/main/platform/utils.test.ts
git commit -m "refactor(platform): add platform module scaffolding with types, utils, and loader"
```

---

### Task 3: Extract macOS paster into platform/darwin/paster.ts

Move the existing macOS-specific paster code into the platform module structure. This is a pure extraction — no logic changes.

**Files:**
- Create: `src/main/platform/darwin/paster.ts`
- Modify: `src/main/input/paster.ts` (will be deleted in Task 7)

**Step 1: Create darwin paster**

Create `src/main/platform/darwin/paster.ts` with the full macOS implementation. This is the contents of the current `src/main/input/paster.ts` with these changes:
- Remove `applyCase` and `stripTrailingPeriod` (now in `utils.ts`)
- Import them from `../utils` instead
- Import `PasteOptions` from `../types`
- Keep all koffi/CoreGraphics/AX API code as-is

The file should export: `isAccessibilityGranted`, `hasFocusedElement`, `hasActiveTextField`, `pasteText`.

The implementation is identical to the current `src/main/input/paster.ts` lines 1–326, with:
- `PasteOptions` interface removed (imported from `../types`)
- `applyCase` function removed (imported from `../utils`)
- `stripTrailingPeriod` function removed (imported from `../utils`)
- New imports at top: `import { applyCase, stripTrailingPeriod } from "../utils";` and `import type { PasteOptions } from "../types";`

**Step 2: Run typecheck on the new file**

```bash
npm run typecheck
```

Expected: May show errors about `platform/index.ts` (win32 modules don't exist yet). The darwin paster itself should have no type errors.

**Step 3: Commit**

```bash
git add src/main/platform/darwin/paster.ts
git commit -m "refactor(platform): extract macOS paster to platform/darwin/paster.ts"
```

---

### Task 4: Extract macOS permissions into platform/darwin/permissions.ts

Extract the permission-related code from `ipc.ts` into a platform module.

**Files:**
- Create: `src/main/platform/darwin/permissions.ts`

**Step 1: Create darwin permissions module**

Create `src/main/platform/darwin/permissions.ts`:

```typescript
import { systemPreferences, shell, app } from "electron";

export function getAccessibilityStatus(): boolean | string {
  try {
    const koffi = require("koffi");
    const appServices = koffi.load(
      "/System/Library/Frameworks/ApplicationServices.framework/ApplicationServices"
    );
    const AXIsProcessTrusted = appServices.func("AXIsProcessTrusted", "bool", []);
    return AXIsProcessTrusted();
  } catch (err: unknown) {
    return `error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

export function getMicrophoneStatus(): string {
  return systemPreferences.getMediaAccessStatus("microphone");
}

export async function requestMicrophoneAccess(): Promise<boolean> {
  app.focus({ steal: true });
  return systemPreferences.askForMediaAccess("microphone");
}

export function openAccessibilitySettings(): void {
  shell.openExternal(
    "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
  );
}
```

**Step 2: Commit**

```bash
git add src/main/platform/darwin/permissions.ts
git commit -m "refactor(platform): extract macOS permissions to platform/darwin/permissions.ts"
```

---

### Task 5: Create Windows paster (platform/win32/paster.ts)

Implement the Windows equivalent of the paster using `user32.dll` via koffi.

**Files:**
- Create: `src/main/platform/win32/paster.ts`
- Create: `tests/main/platform/win32/paster.test.ts`

**Step 1: Write the failing test**

Create `tests/main/platform/win32/paster.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("electron", () => ({
  clipboard: {
    writeText: vi.fn(),
    readText: vi.fn().mockReturnValue(""),
    readHTML: vi.fn().mockReturnValue(""),
    readRTF: vi.fn().mockReturnValue(""),
    write: vi.fn(),
    clear: vi.fn(),
  },
  Notification: class { show() {} },
}));

import { pasteText, isAccessibilityGranted } from "../../../../src/main/platform/win32/paster";
import { clipboard } from "electron";

describe("win32 paster", () => {
  beforeEach(() => {
    vi.mocked(clipboard.writeText).mockClear();
  });

  it("isAccessibilityGranted always returns true on Windows", () => {
    expect(isAccessibilityGranted()).toBe(true);
  });

  it("copies text to clipboard when copyToClipboard is true", () => {
    const result = pasteText("Hello, world!", true);
    expect(clipboard.writeText).toHaveBeenCalledWith("Hello, world!");
    expect(result).toBe(true);
  });

  it("returns false for empty text", () => {
    const result = pasteText("", true);
    expect(clipboard.writeText).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it("applies lowercaseStart option", () => {
    pasteText("Hello", true, { lowercaseStart: true });
    expect(clipboard.writeText).toHaveBeenCalledWith("hello");
  });

  it("strips trailing period from short text", () => {
    pasteText("OK.", true);
    expect(clipboard.writeText).toHaveBeenCalledWith("OK");
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/main/platform/win32/paster.test.ts
```

Expected: FAIL — module not found.

**Step 3: Create the Windows paster implementation**

Create `src/main/platform/win32/paster.ts`:

```typescript
import { clipboard, Notification } from "electron";
import { applyCase, stripTrailingPeriod } from "../utils";
import type { PasteOptions } from "../types";
import { t } from "../../../shared/i18n";

type Pointer = NonNullable<unknown>;

let initialized = false;
let SendInput!: (count: number, inputs: Buffer, size: number) => number;
let GetForegroundWindow!: () => Pointer;
let GetWindowThreadProcessId!: (hwnd: Pointer, pid: Buffer) => number;
let GetGUIThreadInfo!: (threadId: number, info: Buffer) => boolean;

const INPUT_KEYBOARD = 1;
const KEYEVENTF_KEYUP = 0x0002;
const VK_CONTROL = 0x11;
const VK_V = 0x56;
const INPUT_SIZE = 40; // sizeof(INPUT) on 64-bit Windows

function init(): void {
  if (process.env.VITEST) return;
  if (initialized) return;
  initialized = true;

  const koffi = require("koffi");
  const user32 = koffi.load("user32.dll");

  SendInput = user32.func("SendInput", "uint32", ["uint32", "void *", "int32"]);
  GetForegroundWindow = user32.func("GetForegroundWindow", "void *", []);
  GetWindowThreadProcessId = user32.func("GetWindowThreadProcessId", "uint32", ["void *", "uint32 *"]);
  GetGUIThreadInfo = user32.func("GetGUIThreadInfo", "bool", ["uint32", "void *"]);
}

function buildKeyboardInput(vk: number, flags: number): Buffer {
  const buf = Buffer.alloc(INPUT_SIZE);
  buf.writeUInt32LE(INPUT_KEYBOARD, 0);        // type = INPUT_KEYBOARD
  buf.writeUInt16LE(vk, 8);                     // wVk
  buf.writeUInt32LE(flags, 16);                 // dwFlags
  return buf;
}

function simulatePaste(): void {
  init();

  const inputs = Buffer.concat([
    buildKeyboardInput(VK_CONTROL, 0),           // Ctrl down
    buildKeyboardInput(VK_V, 0),                 // V down
    buildKeyboardInput(VK_V, KEYEVENTF_KEYUP),   // V up
    buildKeyboardInput(VK_CONTROL, KEYEVENTF_KEYUP), // Ctrl up
  ]);

  SendInput(4, inputs, INPUT_SIZE);
}

const CLIPBOARD_RESTORE_DELAY_MS = 400;

function injectViaClipboard(text: string): void {
  const prev = {
    text: clipboard.readText(),
    html: clipboard.readHTML(),
    rtf: clipboard.readRTF(),
  };

  clipboard.writeText(text);
  simulatePaste();

  setTimeout(() => {
    if (prev.html || prev.rtf) {
      clipboard.write({ text: prev.text, html: prev.html, rtf: prev.rtf });
    } else if (prev.text) {
      clipboard.writeText(prev.text);
    } else {
      clipboard.clear();
    }
  }, CLIPBOARD_RESTORE_DELAY_MS);
}

export function isAccessibilityGranted(): boolean {
  // Windows has no accessibility permission gate
  return true;
}

export function hasFocusedElement(): boolean {
  try {
    init();
    const hwnd = GetForegroundWindow();
    return !!hwnd;
  } catch {
    return false;
  }
}

export function hasActiveTextField(): boolean {
  try {
    init();
    const hwnd = GetForegroundWindow();
    if (!hwnd) return false;

    const pidBuf = Buffer.alloc(4);
    const threadId = GetWindowThreadProcessId(hwnd, pidBuf);
    if (!threadId) return false;

    // GUITHREADINFO struct: cbSize(4) + flags(4) + hwndActive(8) + hwndFocus(8) + ...
    const guiInfo = Buffer.alloc(72);
    guiInfo.writeUInt32LE(72, 0); // cbSize
    const ok = GetGUIThreadInfo(threadId, guiInfo);
    if (!ok) return false;

    // hwndFocus is at offset 16 (8 bytes on 64-bit)
    const focusPtr = guiInfo.readBigUInt64LE(16);
    return focusPtr !== 0n;
  } catch {
    return false;
  }
}

export function pasteText(text: string, copyToClipboard = true, options?: PasteOptions): boolean {
  if (!text) return false;

  const finalText = applyCase(stripTrailingPeriod(text), options?.lowercaseStart ?? false);

  if (copyToClipboard) {
    clipboard.writeText(finalText);

    try {
      simulatePaste();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      new Notification({
        title: "Vox",
        body: t("notification.pasteFailed", { error: msg.slice(0, 120) }),
      }).show();
    }
    return true;
  } else {
    try {
      injectViaClipboard(finalText);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      new Notification({
        title: "Vox",
        body: t("notification.pasteFailed", { error: msg.slice(0, 120) }),
      }).show();
      return false;
    }
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/main/platform/win32/paster.test.ts
```

Expected: All 5 tests PASS.

**Step 5: Commit**

```bash
git add src/main/platform/win32/paster.ts tests/main/platform/win32/paster.test.ts
git commit -m "feat(platform): add Windows paster with user32.dll keyboard simulation"
```

---

### Task 6: Create Windows permissions (platform/win32/permissions.ts)

**Files:**
- Create: `src/main/platform/win32/permissions.ts`
- Create: `tests/main/platform/win32/permissions.test.ts`

**Step 1: Write the failing test**

Create `tests/main/platform/win32/permissions.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("electron", () => ({
  systemPreferences: {
    getMediaAccessStatus: vi.fn().mockReturnValue("granted"),
    askForMediaAccess: vi.fn().mockResolvedValue(true),
  },
  shell: { openExternal: vi.fn() },
  app: { focus: vi.fn() },
}));

import {
  getAccessibilityStatus,
  getMicrophoneStatus,
  requestMicrophoneAccess,
  openAccessibilitySettings,
} from "../../../../src/main/platform/win32/permissions";
import { shell } from "electron";

describe("win32 permissions", () => {
  it("accessibility is always granted on Windows", () => {
    expect(getAccessibilityStatus()).toBe(true);
  });

  it("returns microphone status from Electron", () => {
    expect(getMicrophoneStatus()).toBe("granted");
  });

  it("requests microphone access", async () => {
    const result = await requestMicrophoneAccess();
    expect(result).toBe(true);
  });

  it("opens Windows privacy settings for microphone", () => {
    openAccessibilitySettings();
    expect(shell.openExternal).toHaveBeenCalledWith("ms-settings:privacy-microphone");
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/main/platform/win32/permissions.test.ts
```

Expected: FAIL — module not found.

**Step 3: Create the Windows permissions implementation**

Create `src/main/platform/win32/permissions.ts`:

```typescript
import { systemPreferences, shell, app } from "electron";

export function getAccessibilityStatus(): boolean | string {
  // Windows has no accessibility permission gate — always granted
  return true;
}

export function getMicrophoneStatus(): string {
  return systemPreferences.getMediaAccessStatus("microphone");
}

export async function requestMicrophoneAccess(): Promise<boolean> {
  app.focus({ steal: true });
  return systemPreferences.askForMediaAccess("microphone");
}

export function openAccessibilitySettings(): void {
  // On Windows, open the microphone privacy settings
  shell.openExternal("ms-settings:privacy-microphone");
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/main/platform/win32/permissions.test.ts
```

Expected: All 4 tests PASS.

**Step 5: Run full typecheck now that both platforms exist**

```bash
npm run typecheck
```

Expected: PASS — the platform loader (`index.ts`) can now resolve both darwin and win32 modules.

**Step 6: Commit**

```bash
git add src/main/platform/win32/permissions.ts tests/main/platform/win32/permissions.test.ts
git commit -m "feat(platform): add Windows permissions module"
```

---

### Task 7: Rewire consumers to use platform modules

Update all files that currently import from `input/paster` or have inline platform-specific code to use the new `platform/` modules instead.

**Files:**
- Modify: `src/main/app.ts` (lines 17, 86, 182-199)
- Modify: `src/main/shortcuts/manager.ts` (line 5)
- Modify: `src/main/ipc.ts` (lines 59-65, 217-257, 270-291)
- Modify: `tests/main/input/paster.test.ts` (update import path)
- Delete: `src/main/input/paster.ts` (replaced by platform modules)

**Step 1: Update app.ts**

Change the import on line 17 from:
```typescript
import { isAccessibilityGranted, applyCase, stripTrailingPeriod } from "./input/paster";
```
to:
```typescript
import { paster, permissions, applyCase, stripTrailingPeriod } from "./platform";
```

Change `isAccessibilityGranted()` call on line 182 to `paster.isAccessibilityGranted()`.

Change the `x-apple.systempreferences:` URL on line 195 to use the platform module:
```typescript
permissions.openAccessibilitySettings();
```

**Step 2: Update shortcuts/manager.ts**

Change line 5 from:
```typescript
import { pasteText, isAccessibilityGranted } from "../input/paster";
```
to:
```typescript
import { paster } from "../platform";
```

Then replace all occurrences of `pasteText(` with `paster.pasteText(` and `isAccessibilityGranted()` with `paster.isAccessibilityGranted()` throughout the file.

**Step 3: Update ipc.ts**

Replace the inline koffi accessibility check in `permissions:status` handler (lines 217-237) with:
```typescript
import { paster, permissions } from "./platform";
```
Then:
```typescript
ipcMain.handle("permissions:status", () => {
  return {
    microphone: permissions.getMicrophoneStatus(),
    accessibility: permissions.getAccessibilityStatus(),
    pid: process.pid,
    execPath: process.execPath,
    bundleId: app.name,
  };
});
```

Replace the `permissions:request-microphone` handler (lines 246-250) with:
```typescript
ipcMain.handle("permissions:request-microphone", async () => {
  return permissions.requestMicrophoneAccess();
});
```

Replace the `permissions:request-accessibility` handler (lines 252-257) with:
```typescript
ipcMain.handle("permissions:request-accessibility", () => {
  permissions.openAccessibilitySettings();
});
```

Replace the `permissions:test-paste` handler (lines 270-291) with:
```typescript
ipcMain.handle("permissions:test-paste", () => {
  const hasAccessibility = paster.isAccessibilityGranted();
  try {
    paster.pasteText("Vox paste test");
    return {
      ok: true,
      hasAccessibility,
      mode: hasAccessibility ? "auto-paste" : "clipboard-only",
    };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err), hasAccessibility };
  }
});
```

Remove the `darwin` guard on launch-at-login (lines 59-65). Change from:
```typescript
if (process.platform === "darwin" && app.isPackaged) {
  app.setLoginItemSettings({
    openAtLogin: config.launchAtLogin,
    openAsHidden: false,
  });
}
```
to:
```typescript
if (app.isPackaged) {
  app.setLoginItemSettings({
    openAtLogin: config.launchAtLogin,
    openAsHidden: false,
  });
}
```

Also replace the `require("./input/paster")` on line 271 with the import from `./platform`.

**Step 4: Update the existing paster test**

Change `tests/main/input/paster.test.ts` import from:
```typescript
import { pasteText } from "../../../src/main/input/paster";
```
to:
```typescript
import { pasteText } from "../../../src/main/platform/darwin/paster";
```

Or better: rename the file to `tests/main/platform/darwin/paster.test.ts` and update the import path accordingly.

**Step 5: Delete the old paster file**

```bash
rm src/main/input/paster.ts
```

If `src/main/input/` is now empty, remove the directory too.

**Step 6: Run full validation**

```bash
npm run typecheck
npm run lint
npx vitest run
```

Expected: All pass. All existing tests should still work because the behavior hasn't changed — only the import paths.

**Step 7: Commit**

```bash
git add -A
git commit -m "refactor(platform): rewire all consumers to use platform modules

- app.ts, ipc.ts, shortcuts/manager.ts now import from platform/
- Removed darwin-only guard from launch-at-login
- Deleted src/main/input/paster.ts (replaced by platform/darwin/paster.ts)"
```

---

### Task 8: Platform-aware window behavior

Adjust the window title bar style and macOS-specific menu roles for cross-platform compatibility.

**Files:**
- Modify: `src/main/windows/home.ts` (lines 114-120, 156, 211-236)

**Step 1: Fix titleBarStyle**

On line 156, change:
```typescript
titleBarStyle: "hiddenInset",
```
to:
```typescript
titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
```

**Step 2: Adjust macOS-only menu items**

In the `buildAppMenu` function (line 24), wrap macOS-only menu roles in a platform check. Change the "Vox" submenu to conditionally include `services`, `hide`, `hideOthers`, `unhide`:

```typescript
{
  label: "Vox",
  submenu: [
    { role: "about" },
    { type: "separator" },
    {
      label: t("menu.checkForUpdates"),
      click: () => menuCallbacks?.onCheckForUpdates(),
    },
    { type: "separator" },
    {
      label: t("menu.visitOnboarding"),
      click: () => menuCallbacks?.onOnboarding(),
    },
    ...(process.platform === "darwin" ? [
      { type: "separator" as const },
      { role: "services" as const },
      { type: "separator" as const },
      { role: "hide" as const },
      { role: "hideOthers" as const },
      { role: "unhide" as const },
    ] : []),
    { type: "separator" },
    { role: "quit" },
  ],
},
```

**Step 3: Run validation**

```bash
npm run typecheck
npm run lint
```

Expected: PASS.

**Step 4: Commit**

```bash
git add src/main/windows/home.ts
git commit -m "fix(windows): platform-aware titleBarStyle and menu roles"
```

---

### Task 9: Final validation and manual test

Run the full validation suite and verify the app works on Windows.

**Step 1: Run all validation commands**

```bash
npm run typecheck
npm run lint
npm run lint:css
npm run check:tokens
npx vitest run
```

All five must exit 0.

**Step 2: Start the dev server and test manually**

```bash
npm run dev
```

Test on Windows:
1. App launches without errors
2. Record voice (hold shortcut key) — UI shows recording indicator
3. Release — whisper transcribes the audio (no more "nothing heard")
4. Text is pasted to clipboard / auto-pasted to focused app
5. Tray icon works
6. Settings window opens and closes properly

**Step 3: Final commit (if any lint/type fixes were needed)**

```bash
git add -A
git commit -m "chore(platform): final validation fixes for Windows support"
```

---

## Summary of files changed

| Action | File |
|--------|------|
| Modify | `src/main/audio/whisper.ts` |
| Create | `src/main/platform/types.ts` |
| Create | `src/main/platform/utils.ts` |
| Create | `src/main/platform/index.ts` |
| Create | `src/main/platform/darwin/paster.ts` |
| Create | `src/main/platform/darwin/permissions.ts` |
| Create | `src/main/platform/win32/paster.ts` |
| Create | `src/main/platform/win32/permissions.ts` |
| Modify | `src/main/app.ts` |
| Modify | `src/main/shortcuts/manager.ts` |
| Modify | `src/main/ipc.ts` |
| Modify | `src/main/windows/home.ts` |
| Move   | `tests/main/input/paster.test.ts` → `tests/main/platform/darwin/paster.test.ts` |
| Create | `tests/main/platform/utils.test.ts` |
| Create | `tests/main/platform/win32/paster.test.ts` |
| Create | `tests/main/platform/win32/permissions.test.ts` |
| Delete | `src/main/input/paster.ts` |
