type Pointer = NonNullable<unknown>;

let initialized = false;
let CFRelease!: (ref: Pointer) => void;
let AXIsProcessTrusted!: () => boolean;
let AXUIElementCreateSystemWide!: () => Pointer | null;
let AXUIElementCopyAttributeValue!: (
  element: Pointer,
  attribute: Pointer,
  value: Pointer,
) => number;
let CFStringCreateWithCString!: (
  alloc: null,
  str: string,
  encoding: number,
) => Pointer | null;
let CFGetTypeID!: (ref: Pointer) => number;
let CFStringGetTypeID!: () => number;
let CFStringGetCString!: (
  str: Pointer,
  buf: Buffer,
  bufSize: number,
  encoding: number,
) => boolean;
let AXUIElementCreateApplication!: (pid: number) => Pointer | null;

const kCFStringEncodingUTF8 = 0x08000100;
const kAXErrorSuccess = 0;

function init(): void {
  if (process.env.VITEST) return;
  if (initialized) return;
  initialized = true;

  const koffi = require("koffi");

  const cf = koffi.load(
    "/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation",
  );
  const appServices = koffi.load(
    "/System/Library/Frameworks/ApplicationServices.framework/ApplicationServices",
  );

  CFRelease = cf.func("CFRelease", "void", ["void *"]);
  CFStringCreateWithCString = cf.func("CFStringCreateWithCString", "void *", [
    "void *",
    "string",
    "uint32",
  ]);
  CFGetTypeID = cf.func("CFGetTypeID", "uint64", ["void *"]);
  CFStringGetTypeID = cf.func("CFStringGetTypeID", "uint64", []);
  CFStringGetCString = cf.func("CFStringGetCString", "bool", [
    "void *",
    "void *",
    "int64",
    "uint32",
  ]);
  AXIsProcessTrusted = appServices.func("AXIsProcessTrusted", "bool", []);
  AXUIElementCreateSystemWide = appServices.func(
    "AXUIElementCreateSystemWide",
    "void *",
    [],
  );
  AXUIElementCopyAttributeValue = appServices.func(
    "AXUIElementCopyAttributeValue",
    "int32",
    ["void *", "void *", "void **"],
  );
  AXUIElementCreateApplication = appServices.func(
    "AXUIElementCreateApplication",
    "void *",
    ["int32"],
  );
}

function getFrontmostPid(): number | null {
  try {
    const { execSync } = require("child_process");
    const out = execSync(
      `osascript -e 'tell application "System Events" to unix id of (first process whose frontmost is true and name is not "Vox")'`,
      { encoding: "utf8", timeout: 500 },
    );
    const pid = parseInt(out.trim(), 10);
    if (!Number.isFinite(pid) || pid === process.pid) return null;
    return pid;
  } catch {
    return null;
  }
}

function queryFocusedElement(
  koffi: typeof import("koffi"),
  parent: Pointer,
): Pointer | null {
  const attr = CFStringCreateWithCString(
    null,
    "AXFocusedUIElement",
    kCFStringEncodingUTF8,
  );
  if (!attr) return null;

  const valueBuf = Buffer.alloc(8);
  const err = AXUIElementCopyAttributeValue(parent, attr, valueBuf);
  CFRelease(attr);
  if (err !== kAXErrorSuccess) return null;

  return koffi.decode(valueBuf, "void *") as Pointer | null;
}

function readSelectedText(
  koffi: typeof import("koffi"),
  element: Pointer,
): string {
  const attr = CFStringCreateWithCString(
    null,
    "AXSelectedText",
    kCFStringEncodingUTF8,
  );
  if (!attr) return "";

  try {
    const valueBuf = Buffer.alloc(8);
    const err = AXUIElementCopyAttributeValue(element, attr, valueBuf);
    if (err !== kAXErrorSuccess) return "";

    const cfStr = koffi.decode(valueBuf, "void *");
    if (!cfStr) return "";

    try {
      if (CFGetTypeID(cfStr) !== CFStringGetTypeID()) return "";

      const strBuf = Buffer.alloc(4096);
      if (!CFStringGetCString(cfStr, strBuf, 4096, kCFStringEncodingUTF8))
        return "";

      return strBuf.toString("utf8").split("\0")[0];
    } finally {
      CFRelease(cfStr);
    }
  } finally {
    CFRelease(attr);
  }
}

export async function getSelectedText(): Promise<string> {
  if (process.env.VITEST) return "";

  try {
    init();
    if (!AXIsProcessTrusted()) return "";

    const koffi = require("koffi");

    // Primary path: query the frontmost app directly (avoids focus race
    // when the HUD steals system focus via setIgnoreMouseEvents).
    const pid = getFrontmostPid();
    if (pid != null) {
      const appElement = AXUIElementCreateApplication(pid);
      if (appElement) {
        const focused = queryFocusedElement(koffi, appElement);
        CFRelease(appElement);
        if (focused) {
          try {
            const text = readSelectedText(koffi, focused);
            if (text) return text;
          } finally {
            CFRelease(focused);
          }
        }
      }
    }

    // Fallback: try system-wide AXFocusedUIElement
    const systemWide = AXUIElementCreateSystemWide();
    if (systemWide) {
      const focused = queryFocusedElement(koffi, systemWide);
      CFRelease(systemWide);
      if (focused) {
        try {
          return readSelectedText(koffi, focused);
        } finally {
          CFRelease(focused);
        }
      }
    }

    return "";
  } catch {
    return "";
  }
}
