import { describe, it, expect, vi } from "vitest";

vi.mock("electron", () => ({
  app: { getAppPath: vi.fn().mockReturnValue("/mock/appPath"), isPackaged: false },
}));

vi.mock("../../../src/main/platform", () => ({
  whisper: { binaryName: "whisper-cli", threads: 4, timeout: 30000, timeoutPerAudioSecond: 500, resolveLanguage: (d: string) => d },
}));

import { whisperTimeoutMs } from "../../../src/main/audio/whisper";

describe("whisperTimeoutMs", () => {
  it("grants more time than the base for a multi-minute recording", () => {
    // 193 s of audio took ~22 s with the large model; base alone (30 s) leaves no margin for longer speech.
    expect(whisperTimeoutMs(600)).toBe(30000 + 600 * 500);
    expect(whisperTimeoutMs(600)).toBeGreaterThan(whisperTimeoutMs(5));
  });
});
