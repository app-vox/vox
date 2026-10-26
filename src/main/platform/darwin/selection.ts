import log from "electron-log/main";

const slog = log.scope("Selection");

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

// Remember the last PID that had selected text so we can try it first.
let lastKnownPid: number | null = null;

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

function getVisiblePids(): number[] {
  try {
    const { execSync } = require("child_process");
    const myPid = process.pid;
    const out = execSync(
      `osascript -e 'tell application "System Events" to get unix id of every process whose visible is true'`,
      { encoding: "utf8", timeout: 500 },
    );
    return out
      .trim()
      .split(",")
      .map((s: string) => parseInt(s.trim(), 10))
      .filter((p: number) => Number.isFinite(p) && p !== myPid);
  } catch {
    return [];
  }
}

function getFrontmostPid(): number | null {
  try {
    const { execSync } = require("child_process");
    const myPid = process.pid;
    const out = execSync(
      `osascript -e 'tell application "System Events" to unix id of (first process whose frontmost is true)'`,
      { encoding: "utf8", timeout: 500 },
    );
    const pid = parseInt(out.trim(), 10);
    if (!Number.isFinite(pid)) return null;
    if (pid !== myPid) return pid;
    return null;
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

/** Try to read selected text from a specific PID. Returns text or "". */
function tryReadFromPid(koffi: typeof import("koffi"), pid: number): string {
  const appElement = AXUIElementCreateApplication(pid);
  if (!appElement) return "";

  const focused = queryFocusedElement(koffi, appElement);
  CFRelease(appElement);
  if (!focused) return "";

  try {
    return readSelectedText(koffi, focused);
  } finally {
    CFRelease(focused);
  }
}

export async function getSelectedText(): Promise<string> {
  if (process.env.VITEST) return "";

  try {
    init();
    if (!AXIsProcessTrusted()) return "";

    const koffi = require("koffi");

    // 1. Try the frontmost non-Electron app first (most common case).
    const frontPid = getFrontmostPid();
    slog.info("frontPid=%s lastKnownPid=%s myPid=%d", frontPid, lastKnownPid, process.pid);

    if (frontPid != null) {
      const text = tryReadFromPid(koffi, frontPid);
      if (text) {
        lastKnownPid = frontPid;
        slog.info("found via frontmost pid=%d len=%d", frontPid, text.length);
        return text;
      }
    }

    // 2. Try the last PID that had text (survives focus shifts to HUD).
    if (lastKnownPid != null && lastKnownPid !== frontPid) {
      const text = tryReadFromPid(koffi, lastKnownPid);
      if (text) {
        slog.info("found via lastKnown pid=%d len=%d", lastKnownPid, text.length);
        return text;
      }
    }

    // 3. Brute-force: try every visible non-Electron process.
    const pids = getVisiblePids();
    for (const pid of pids) {
      if (pid === frontPid || pid === lastKnownPid) continue; // already tried
      const text = tryReadFromPid(koffi, pid);
      if (text) {
        lastKnownPid = pid;
        slog.info("found via scan pid=%d len=%d", pid, text.length);
        return text;
      }
    }

    // 4. Fallback: system-wide AXFocusedUIElement
    const systemWide = AXUIElementCreateSystemWide();
    if (systemWide) {
      const focused = queryFocusedElement(koffi, systemWide);
      CFRelease(systemWide);
      if (focused) {
        try {
          const text = readSelectedText(koffi, focused);
          if (text) {
            slog.info("found via system-wide len=%d", text.length);
            return text;
          }
        } finally {
          CFRelease(focused);
        }
      }
    }

    slog.info("no selected text found");
    return "";
  } catch (err) {
    slog.warn("getSelectedText error: %s", err instanceof Error ? err.message : String(err));
    return "";
  }
}
