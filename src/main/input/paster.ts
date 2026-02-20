import { clipboard, Notification } from "electron";
import { t } from "../../shared/i18n";

// CoreGraphics constants
const kCGEventSourceStateHIDSystemState = 1;
const kCGEventFlagMaskCommand = 0x100000;
const kCGHIDEventTap = 0;
const kVirtualKeyV = 9;

// Opaque native pointer returned by koffi FFI calls
type Pointer = NonNullable<unknown>;

let initialized = false;
let CGEventSourceCreate!: (stateId: number) => Pointer | null;
let CGEventCreateKeyboardEvent!: (source: Pointer, keyCode: number, keyDown: boolean) => Pointer;
let CGEventSetFlags!: (event: Pointer, flags: number) => void;
let CGEventPost!: (tap: number, event: Pointer) => void;
let CFRelease!: (ref: Pointer) => void;
let AXIsProcessTrusted!: () => boolean;

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
  CFRelease = cf.func("CFRelease", "void", ["void *"]);
  AXIsProcessTrusted = appServices.func("AXIsProcessTrusted", "bool", []);
}

export function isAccessibilityGranted(): boolean {
  try {
    initCGEvent();
    return AXIsProcessTrusted();
  } catch {
    return false;
  }
}

/**
 * Simulate Cmd+V using CoreGraphics CGEvent API called in-process via FFI.
 * Requires accessibility permission — events are silently dropped without it.
 */
function simulatePaste(): void {
  initCGEvent();

  const src = CGEventSourceCreate(kCGEventSourceStateHIDSystemState);
  if (!src) throw new Error("CGEventSourceCreate returned null");

  const keyDown = CGEventCreateKeyboardEvent(src, kVirtualKeyV, true);
  CGEventSetFlags(keyDown, kCGEventFlagMaskCommand);
  CGEventPost(kCGHIDEventTap, keyDown);

  // Synchronous 50ms delay between key-down and key-up
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);

  const keyUp = CGEventCreateKeyboardEvent(src, kVirtualKeyV, false);
  CGEventPost(kCGHIDEventTap, keyUp);

  CFRelease(keyUp);
  CFRelease(keyDown);
  CFRelease(src);
}

export function pasteText(text: string): void {
  if (!text) return;

  clipboard.writeText(text);

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
      body: t("notification.copiedToClipboard", { text: text.slice(0, 100) }),
    }).show();
  }
}
