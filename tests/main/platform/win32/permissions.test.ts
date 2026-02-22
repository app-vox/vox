import { describe, it, expect, vi } from "vitest";

vi.mock("electron", () => ({
  systemPreferences: {
    getMediaAccessStatus: vi.fn().mockReturnValue("granted"),
    askForMediaAccess: vi.fn().mockResolvedValue(true),
  },
  shell: { openExternal: vi.fn() },
  app: { focus: vi.fn() },
}));

import {
  getAccessibilityStatus,
  getMicrophoneStatus,
  requestMicrophoneAccess,
  openAccessibilitySettings,
} from "../../../../src/main/platform/win32/permissions";
import { shell } from "electron";

describe("win32 permissions", () => {
  it("accessibility is always granted on Windows", () => {
    expect(getAccessibilityStatus()).toBe(true);
  });

  it("returns microphone status from Electron", () => {
    expect(getMicrophoneStatus()).toBe("granted");
  });

  it("requests microphone access", async () => {
    const result = await requestMicrophoneAccess();
    expect(result).toBe(true);
  });

  it("opens Windows privacy settings for microphone", () => {
    openAccessibilitySettings();
    expect(shell.openExternal).toHaveBeenCalledWith("ms-settings:privacy-microphone");
  });
});
