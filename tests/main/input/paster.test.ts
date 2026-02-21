import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("electron", () => ({
  clipboard: { writeText: vi.fn() },
  Notification: class { show() {} },
}));

import { pasteText } from "../../../src/main/input/paster";
import { clipboard } from "electron";

describe("pasteText", () => {
  beforeEach(() => {
    vi.mocked(clipboard.writeText).mockClear();
  });

  it("should copy text to clipboard when copyToClipboard is true", () => {
    const result = pasteText("Hello, world!", true);
    expect(clipboard.writeText).toHaveBeenCalledWith("Hello, world!");
    expect(result).toBe(true);
  });

  it("should not paste empty text", () => {
    const result = pasteText("", true);
    expect(clipboard.writeText).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it("should not throw when CGEvent is unavailable", () => {
    expect(() => pasteText("Some text", true)).not.toThrow();
    expect(clipboard.writeText).toHaveBeenCalledWith("Some text");
  });

  it("should not write to clipboard when copyToClipboard is false", () => {
    const result = pasteText("Hello", false);
    expect(clipboard.writeText).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it("should not throw when CGEvent is unavailable and copyToClipboard is false", () => {
    expect(() => pasteText("Some text", false)).not.toThrow();
  });
});
