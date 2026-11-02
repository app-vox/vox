import { describe, it, expect, vi } from "vitest";

vi.mock("electron", () => ({
  shell: { openExternal: vi.fn() },
}));

vi.mock("electron-log/main", () => ({
  default: { scope: () => ({ info: vi.fn(), warn: vi.fn() }) },
}));

import {
  getAccessibilityStatus,
  getMicrophoneStatus,
  requestMicrophoneAccess,
  openAccessibilitySettings,
} from "../../../../src/main/platform/linux/permissions";

describe("linux permissions", () => {
  it("accessibility is always granted on Linux", () => {
    expect(getAccessibilityStatus()).toBe(true);
  });

  it("microphone is always granted on Linux", () => {
    expect(getMicrophoneStatus()).toBe("granted");
  });

  it("requestMicrophoneAccess resolves to true", async () => {
    const result = await requestMicrophoneAccess();
    expect(result).toBe(true);
  });

  it("openAccessibilitySettings is a no-op", () => {
    expect(() => openAccessibilitySettings()).not.toThrow();
  });
});
