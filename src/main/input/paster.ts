import { clipboard, Notification } from "electron";

// CoreGraphics constants
const kCGEventSourceStateHIDSystemState = 1;
const kCGEventFlagMaskCommand = 0x100000;
const kCGHIDEventTap = 0;
const kVirtualKeyV = 9;

let cg: any;
let cf: any;
let appServices: any;
let CGEventSourceCreate: any;
let CGEventCreateKeyboardEvent: any;
let CGEventSetFlags: any;
let CGEventPost: any;
let CFRelease: any;
let AXIsProcessTrusted: any;

function initCGEvent(): void {
  if (cg) return;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const koffi = require("koffi");

  cg = koffi.load("/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics");
  cf = koffi.load("/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation");
  appServices = koffi.load("/System/Library/Frameworks/ApplicationServices.framework/ApplicationServices");

  CGEventSourceCreate = cg.func("CGEventSourceCreate", "void *", ["int32"]);
  CGEventCreateKeyboardEvent = cg.func("CGEventCreateKeyboardEvent", "void *", ["void *", "uint16", "bool"]);
  CGEventSetFlags = cg.func("CGEventSetFlags", "void", ["void *", "uint64"]);
  CGEventPost = cg.func("CGEventPost", "void", ["uint32", "void *"]);
  CFRelease = cf.func("CFRelease", "void", ["void *"]);
  AXIsProcessTrusted = appServices.func("AXIsProcessTrusted", "bool", []);
}

function isAccessibilityGranted(): boolean {
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
    } catch (err: any) {
      const msg = String(err.message || err);
      new Notification({
        title: "Vox",
        body: `Auto-paste failed: ${msg.slice(0, 120)}. Text is on your clipboard.`,
      }).show();
    }
  } else {
    new Notification({
      title: "Vox",
      body: `${text.slice(0, 100)}${text.length > 100 ? "..." : ""}\nCopied — press Cmd+V to paste.`,
    }).show();
  }
}
