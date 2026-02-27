import { clipboard, Notification } from "electron";
import { t } from "../../shared/i18n";

const kCGEventSourceStateHIDSystemState = 1;
const kCGEventFlagMaskCommand = 0x100000;
const kCGHIDEventTap = 0;
const kVirtualKeyV = 9;

type Pointer = NonNullable<unknown>;

let initialized = false;
let CGEventSourceCreate!: (stateId: number) => Pointer | null;
let CGEventCreateKeyboardEvent!: (source: Pointer, keyCode: number, keyDown: boolean) => Pointer;
let CGEventSetFlags!: (event: Pointer, flags: number) => void;
let CGEventPost!: (tap: number, event: Pointer) => void;
let CGEventKeyboardSetUnicodeString!: (event: Pointer, length: number, str: Buffer) => void;
let CFRelease!: (ref: Pointer) => void;
let AXIsProcessTrusted!: () => boolean;
let AXUIElementCreateSystemWide!: () => Pointer | null;
let AXUIElementCopyAttributeValue!: (element: Pointer, attribute: Pointer, value: Pointer) => number;
let CFStringCreateWithCString!: (alloc: null, str: string, encoding: number) => Pointer | null;
let CFGetTypeID!: (ref: Pointer) => number;
let CFStringGetTypeID!: () => number;
let CFStringGetCString!: (str: Pointer, buf: Buffer, bufSize: number, encoding: number) => boolean;
let AXUIElementCreateApplication!: (pid: number) => Pointer | null;

function initCGEvent(): void {
  if (process.env.VITEST) return;
  if (initialized) return;
  initialized = true;

  const koffi = require("koffi");

  const cg = koffi.load("/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics");
  const cf = koffi.load("/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation");
  const appServices = koffi.load("/System/Library/Frameworks/ApplicationServices.framework/ApplicationServices");

  CGEventSourceCreate = cg.func("CGEventSourceCreate", "void *", ["int32"]);
  CGEventCreateKeyboardEvent = cg.func("CGEventCreateKeyboardEvent", "void *", ["void *", "uint16", "bool"]);
  CGEventSetFlags = cg.func("CGEventSetFlags", "void", ["void *", "uint64"]);
  CGEventPost = cg.func("CGEventPost", "void", ["uint32", "void *"]);
  CGEventKeyboardSetUnicodeString = cg.func(
    "CGEventKeyboardSetUnicodeString", "void", ["void *", "uint32", "void *"]
  );
  CFRelease = cf.func("CFRelease", "void", ["void *"]);
  AXIsProcessTrusted = appServices.func("AXIsProcessTrusted", "bool", []);
  AXUIElementCreateSystemWide = appServices.func("AXUIElementCreateSystemWide", "void *", []);
  AXUIElementCopyAttributeValue = appServices.func("AXUIElementCopyAttributeValue", "int32", ["void *", "void *", "void **"]);
  CFStringCreateWithCString = cf.func("CFStringCreateWithCString", "void *", ["void *", "string", "uint32"]);
  CFGetTypeID = cf.func("CFGetTypeID", "uint64", ["void *"]);
  CFStringGetTypeID = cf.func("CFStringGetTypeID", "uint64", []);
  CFStringGetCString = cf.func("CFStringGetCString", "bool", ["void *", "void *", "int64", "uint32"]);
  AXUIElementCreateApplication = appServices.func("AXUIElementCreateApplication", "void *", ["int32"]);
}

export function isAccessibilityGranted(): boolean {
  try {
    initCGEvent();
    return AXIsProcessTrusted();
  } catch {
    return false;
  }
}

const kCFStringEncodingUTF8 = 0x08000100;
const kAXErrorSuccess = 0;

const TEXT_INPUT_ROLES = new Set([
  "AXTextField",
  "AXTextArea",
  "AXComboBox",
  "AXSearchField",
]);

function matchesTextInputRole(koffi: typeof import("koffi"), element: Pointer): boolean {
  const roleAttr = CFStringCreateWithCString(null, "AXRole", kCFStringEncodingUTF8);
  if (!roleAttr) return false;

  try {
    const roleBuf = Buffer.alloc(8);
    const roleErr = AXUIElementCopyAttributeValue(element, roleAttr, roleBuf);
    if (roleErr !== kAXErrorSuccess) return false;

    const roleRef = koffi.decode(roleBuf, "void *");
    if (!roleRef) return false;

    try {
      if (CFGetTypeID(roleRef) !== CFStringGetTypeID()) return false;

      const strBuf = Buffer.alloc(256);
      if (!CFStringGetCString(roleRef, strBuf, 256, kCFStringEncodingUTF8)) return false;

      const role = strBuf.toString("utf8").split("\0")[0];
      return TEXT_INPUT_ROLES.has(role);
    } finally {
      CFRelease(roleRef);
    }
  } finally {
    CFRelease(roleAttr);
  }
}

function queryFocusedChild(koffi: typeof import("koffi"), parent: Pointer): Pointer | null {
  const valueBuf = Buffer.alloc(8);
  const focusedAttr = CFStringCreateWithCString(null, "AXFocusedUIElement", kCFStringEncodingUTF8);
  if (!focusedAttr) return null;

  const err = AXUIElementCopyAttributeValue(parent, focusedAttr, valueBuf);
  CFRelease(focusedAttr);
  if (err !== kAXErrorSuccess) return null;

  return koffi.decode(valueBuf, "void *") as Pointer | null;
}

function getFrontmostPid(): number | null {
  try {
    const { execSync } = require("child_process");
    const out = execSync(
      `osascript -e 'tell application "System Events" to unix id of (first process whose frontmost is true)'`,
      { encoding: "utf8", timeout: 500 },
    );
    const pid = parseInt(out.trim(), 10);
    return Number.isFinite(pid) ? pid : null;
  } catch {
    return null;
  }
}

function getFocusedElement(): { koffi: typeof import("koffi"); focused: Pointer; release: () => void } | null {
  initCGEvent();
  if (!AXIsProcessTrusted()) return null;

  const koffi = require("koffi");

  const systemWide = AXUIElementCreateSystemWide();
  if (systemWide) {
    const focused = queryFocusedChild(koffi, systemWide);
    CFRelease(systemWide);
    if (focused) return { koffi, focused, release: () => CFRelease(focused) };
  }

  const pid = getFrontmostPid();
  if (pid == null) return null;

  const appElement = AXUIElementCreateApplication(pid);
  if (!appElement) return null;

  const focused = queryFocusedChild(koffi, appElement);
  CFRelease(appElement);
  if (!focused) return null;

  return { koffi, focused, release: () => CFRelease(focused) };
}

export function hasFocusedElement(): boolean {
  try {
    const el = getFocusedElement();
    if (!el) return false;
    el.release();
    return true;
  } catch {
    return false;
  }
}

export function hasActiveTextField(): boolean {
  try {
    const el = getFocusedElement();
    if (!el) return false;

    try {
      return matchesTextInputRole(el.koffi, el.focused);
    } finally {
      el.release();
    }
  } catch {
    return false;
  }
}

function simulatePaste(): void {
  initCGEvent();

  const src = CGEventSourceCreate(kCGEventSourceStateHIDSystemState);
  if (!src) throw new Error("CGEventSourceCreate returned null");

  const keyDown = CGEventCreateKeyboardEvent(src, kVirtualKeyV, true);
  CGEventSetFlags(keyDown, kCGEventFlagMaskCommand);
  CGEventPost(kCGHIDEventTap, keyDown);

  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);

  const keyUp = CGEventCreateKeyboardEvent(src, kVirtualKeyV, false);
  CGEventPost(kCGHIDEventTap, keyUp);

  CFRelease(keyUp);
  CFRelease(keyDown);
  CFRelease(src);
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

export interface PasteOptions {
  lowercaseStart?: boolean;
  shiftCapitalize?: boolean;
}

export function applyCase(text: string, lowercaseStart: boolean, forceCapitalize = false): string {
  if (!text) return text;
  if (lowercaseStart && !forceCapitalize) return text[0].toLowerCase() + text.slice(1);
  return text;
}

export function stripTrailingPeriod(text: string): string {
  if (!text.endsWith(".")) return text;
  const words = text.trim().split(/\s+/);
  if (words.length <= 3) return text.slice(0, -1);
  return text;
}

const UNICODE_CHUNK_SIZE = 20;

function typeText(text: string): void {
  initCGEvent();

  const src = CGEventSourceCreate(kCGEventSourceStateHIDSystemState);
  if (!src) throw new Error("CGEventSourceCreate returned null");

  try {
    for (let i = 0; i < text.length; i += UNICODE_CHUNK_SIZE) {
      const chunk = text.slice(i, i + UNICODE_CHUNK_SIZE);
      const buf = Buffer.from(chunk, "utf16le");

      const keyDown = CGEventCreateKeyboardEvent(src, 0, true);
      CGEventKeyboardSetUnicodeString(keyDown, chunk.length, buf);
      CGEventPost(kCGHIDEventTap, keyDown);

      const keyUp = CGEventCreateKeyboardEvent(src, 0, false);
      CGEventPost(kCGHIDEventTap, keyUp);

      CFRelease(keyUp);
      CFRelease(keyDown);

      if (i + UNICODE_CHUNK_SIZE < text.length) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
      }
    }
  } finally {
    CFRelease(src);
  }
}

export function pasteText(text: string, copyToClipboard = true, options?: PasteOptions): boolean {
  if (!text) return false;

  const finalText = applyCase(stripTrailingPeriod(text), options?.lowercaseStart ?? false, options?.shiftCapitalize ?? false);

  if (copyToClipboard) {
    clipboard.writeText(finalText);

    if (isAccessibilityGranted()) {
      try {
        simulatePaste();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        new Notification({
          title: "Vox",
          body: t("notification.pasteFailed", { error: msg.slice(0, 120) }),
        }).show();
      }
    } else {
      new Notification({
        title: "Vox",
        body: t("notification.copiedToClipboard", { text: finalText.slice(0, 100) }),
      }).show();
    }
    return true;
  } else {
    if (!isAccessibilityGranted()) return false;

    if (hasActiveTextField()) {
      try {
        typeText(finalText);
        return true;
      } catch {
        // CGEvent failed — fall through to clipboard fallback
      }
    } else if (hasFocusedElement()) {
      // Focused element exists but is NOT a text field (e.g. System Preferences,
      // blank web page) — signal failure so the caller can show a warning.
      return false;
    }

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
