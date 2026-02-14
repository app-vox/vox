import { describe, it, expect } from "vitest";
import { generateCueSamples } from "../../../src/shared/audio-cue";

describe("generateCueSamples", () => {
  it("should generate click samples at 44100 sample rate", () => {
    const samples = generateCueSamples("click", 44100);
    expect(samples.length).toBeGreaterThan(0);
    expect(samples.length).toBeLessThanOrEqual(44100);
    for (const s of samples) {
      expect(s).toBeGreaterThanOrEqual(-1);
      expect(s).toBeLessThanOrEqual(1);
    }
  });

  it("should generate beep samples", () => {
    const samples = generateCueSamples("beep", 44100);
    expect(samples.length).toBeGreaterThan(0);
  });

  it("should generate chime samples", () => {
    const samples = generateCueSamples("chime", 44100);
    expect(samples.length).toBeGreaterThan(0);
  });

  it("should return empty array for 'none'", () => {
    const samples = generateCueSamples("none", 44100);
    expect(samples).toEqual([]);
  });
});
