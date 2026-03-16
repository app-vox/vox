import { describe, it, expect } from "vitest";
import { binaryName, threads, timeout, resolveLanguage } from "../../../../src/main/platform/linux/whisper";

describe("linux whisper", () => {
  it("uses whisper-cli binary (no .exe)", () => {
    expect(binaryName).toBe("whisper-cli");
  });

  it("uses at least 4 threads", () => {
    expect(threads).toBeGreaterThanOrEqual(4);
  });

  it("has 120s timeout for CPU-only inference", () => {
    expect(timeout).toBe(120_000);
  });

  it("returns first configured language when detected is auto", () => {
    expect(resolveLanguage("auto", ["pt", "en"])).toBe("pt");
  });

  it("returns detected language when not auto", () => {
    expect(resolveLanguage("en", ["pt", "en"])).toBe("en");
  });

  it("returns auto when no speech languages configured", () => {
    expect(resolveLanguage("auto", [])).toBe("auto");
  });
});
