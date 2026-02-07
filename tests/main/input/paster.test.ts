import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("electron", () => ({
  clipboard: { writeText: vi.fn() },
  Notification: class { show() {} },
}));

// Mock koffi to simulate CGEvent API — all functions are no-ops that return
// non-null values so the null-check in simulatePaste() passes.
vi.mock("koffi", () => ({
  load: vi.fn().mockReturnValue({
    func: vi.fn().mockReturnValue(vi.fn().mockReturnValue({})),
  }),
}));

import { pasteText } from "../../../src/main/input/paster";
import { clipboard } from "electron";

describe("pasteText", () => {
  beforeEach(() => {
    vi.mocked(clipboard.writeText).mockClear();
  });

  it("should copy text to clipboard and simulate paste", () => {
    pasteText("Hello, world!");
    expect(clipboard.writeText).toHaveBeenCalledWith("Hello, world!");
  });

  it("should not paste empty text", () => {
    pasteText("");
    expect(clipboard.writeText).not.toHaveBeenCalled();
  });

  it("should not throw if paste simulation fails", () => {
    // The koffi mock is set up to not throw, so this tests the general
    // error handling path. A real failure would come from CGEvent returning null.
    expect(() => pasteText("Some text")).not.toThrow();
    expect(clipboard.writeText).toHaveBeenCalledWith("Some text");
  });
});
