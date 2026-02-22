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

  const stripped = (options?.finishWithPeriod ?? true) ? text : stripTrailingPeriod(text);
  const finalText = applyCase(stripped, options?.lowercaseStart ?? false, options?.shiftCapitalize ?? false);

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
