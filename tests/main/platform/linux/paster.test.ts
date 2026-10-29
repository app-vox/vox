import { describe, it, expect, vi, beforeEach } from "vitest";
import { execSync } from "child_process";

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

vi.mock("child_process", () => ({
  execSync: vi.fn(),
}));

vi.mock("electron-log/main", () => ({
  default: { scope: () => ({ info: vi.fn(), warn: vi.fn() }) },
}));

vi.mock("../../../../src/shared/i18n", () => ({
  t: vi.fn((key: string) => key),
}));

import { pasteText, isAccessibilityGranted, hasFocusedElement, hasActiveTextField } from "../../../../src/main/platform/linux/paster";
import { clipboard } from "electron";

describe("linux paster", () => {
  beforeEach(() => {
    vi.mocked(clipboard.writeText).mockClear();
    vi.mocked(execSync).mockClear();
  });

  it("isAccessibilityGranted always returns true", () => {
    expect(isAccessibilityGranted()).toBe(true);
  });

  it("hasFocusedElement returns true when xdotool succeeds", () => {
    vi.mocked(execSync).mockReturnValue(Buffer.from("12345678"));
    expect(hasFocusedElement()).toBe(true);
  });

  it("hasFocusedElement returns false when xdotool fails", () => {
    vi.mocked(execSync).mockImplementation(() => { throw new Error("no display"); });
    expect(hasFocusedElement()).toBe(false);
  });

  it("hasActiveTextField delegates to hasFocusedElement", () => {
    vi.mocked(execSync).mockReturnValue(Buffer.from("12345678"));
    expect(hasActiveTextField()).toBe(true);
  });

  it("copies text to clipboard and simulates paste via xdotool", () => {
    vi.mocked(execSync).mockReturnValue(Buffer.from(""));
    const result = pasteText("Hello, world!", true);
    expect(clipboard.writeText).toHaveBeenCalledWith("Hello, world!");
    expect(execSync).toHaveBeenCalledWith("xdotool key --clearmodifiers ctrl+v", expect.any(Object));
    expect(result).toBe(true);
  });

  it("returns false for empty text", () => {
    const result = pasteText("", true);
    expect(clipboard.writeText).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it("applies lowercaseStart option", () => {
    vi.mocked(execSync).mockReturnValue(Buffer.from(""));
    pasteText("Hello", true, { lowercaseStart: true });
    expect(clipboard.writeText).toHaveBeenCalledWith("hello");
  });

  it("strips trailing period from short text when finishWithPeriod is false", () => {
    vi.mocked(execSync).mockReturnValue(Buffer.from(""));
    pasteText("OK.", true, { finishWithPeriod: false });
    expect(clipboard.writeText).toHaveBeenCalledWith("OK");
  });

  it("falls back to clipboard-only when xdotool paste fails", () => {
    vi.mocked(execSync).mockImplementation(() => { throw new Error("xdotool not found"); });
    const result = pasteText("Hello", true);
    expect(clipboard.writeText).toHaveBeenCalledWith("Hello");
    expect(result).toBe(true);
  });
});
