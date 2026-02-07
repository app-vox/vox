import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Electron clipboard and execSync before importing
vi.mock("electron", () => ({
  clipboard: { writeText: vi.fn() },
  Notification: class { show() {} },
}));
vi.mock("child_process", () => ({
  execSync: vi.fn(),
}));

import { pasteText } from "../../../src/main/input/paster";
import { clipboard } from "electron";
import { execSync } from "child_process";

describe("pasteText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should copy text to clipboard and simulate Cmd+V", () => {
    pasteText("Hello, world!");

    expect(clipboard.writeText).toHaveBeenCalledWith("Hello, world!");
    expect(execSync).toHaveBeenCalledOnce();
  });

  it("should not paste empty text", () => {
    pasteText("");

    expect(clipboard.writeText).not.toHaveBeenCalled();
    expect(execSync).not.toHaveBeenCalled();
  });

  it("should not throw if execSync fails", () => {
    vi.mocked(execSync).mockImplementationOnce(() => { throw new Error("fail"); });

    expect(() => pasteText("Some text")).not.toThrow();
    expect(clipboard.writeText).toHaveBeenCalledWith("Some text");
  });
});
