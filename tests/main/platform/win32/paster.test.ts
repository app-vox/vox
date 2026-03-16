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

  it("strips trailing period from short text when finishWithPeriod is false", () => {
    pasteText("OK.", true, { finishWithPeriod: false });
    expect(clipboard.writeText).toHaveBeenCalledWith("OK");
  });

  it("keeps trailing period when finishWithPeriod is true (default)", () => {
    pasteText("OK.", true);
    expect(clipboard.writeText).toHaveBeenCalledWith("OK.");
  });
});
