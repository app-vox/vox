import { describe, it, expect, vi } from "vitest";

vi.mock("electron", () => ({
  app: { getAppPath: vi.fn().mockReturnValue("/mock/appPath"), isPackaged: false },
}));

vi.mock("../../../src/main/platform", () => ({
  whisper: { binaryName: "whisper-cli", threads: 4, timeout: 30000, timeoutPerAudioSecond: 500, resolveLanguage: (d: string) => d },
}));

import { buildWhisperCliArgs } from "../../../src/main/audio/whisper";

describe("buildWhisperCliArgs", () => {
  it("runs whisper-cli with no carried text context", () => {
    // Carrying text between 30 s windows doubled the time on a 251 s recording and caused a repetition loop.
    const args = buildWhisperCliArgs("/models/large.bin", "/tmp/rec.wav", "Vox", "en", undefined);

    const mc = args.indexOf("-mc");
    expect(mc).toBeGreaterThanOrEqual(0);
    expect(args[mc + 1]).toBe("0");
  });
});
