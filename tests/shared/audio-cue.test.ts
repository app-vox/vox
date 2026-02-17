import { describe, it, expect } from "vitest";
import { isWavCue, getWavFilename, parseWavSamples, generateCueSamples } from "../../src/shared/audio-cue";
import type { AudioCueType } from "../../src/shared/config";

describe("isWavCue", () => {
  it.each<[AudioCueType, boolean]>([
    ["tap", true],
    ["tick", true],
    ["pop", true],
    ["ping", true],
    ["ding", true],
    ["nudge", true],
    ["error", true],
    ["click", false],
    ["beep", false],
    ["chime", false],
    ["none", false],
  ])("isWavCue(%j) should return %s", (type, expected) => {
    expect(isWavCue(type)).toBe(expected);
  });
});

describe("getWavFilename", () => {
  it.each<[AudioCueType, string | null]>([
    ["tap", "tap.wav"],
    ["tick", "tick.wav"],
    ["pop", "pop.wav"],
    ["ping", "ping.wav"],
    ["ding", "ding.wav"],
    ["nudge", "nudge.wav"],
    ["error", "error.wav"],
    ["click", null],
    ["beep", null],
    ["chime", null],
    ["none", null],
  ])("getWavFilename(%j) should return %j", (type, expected) => {
    expect(getWavFilename(type)).toBe(expected);
  });
});

describe("parseWavSamples", () => {
  function buildWavBuffer(opts: {
    channels?: number;
    sampleRate?: number;
    bitsPerSample?: number;
    samples: number[];
  }): Buffer {
    const channels = opts.channels ?? 1;
    const sampleRate = opts.sampleRate ?? 44100;
    const bitsPerSample = opts.bitsPerSample ?? 16;
    const bytesPerSample = bitsPerSample / 8;
    const dataSize = opts.samples.length * bytesPerSample;

    // RIFF header (12) + fmt chunk (24) + data chunk header (8) + data
    const totalSize = 12 + 24 + 8 + dataSize;
    const buf = Buffer.alloc(totalSize);

    // RIFF header
    buf.write("RIFF", 0);
    buf.writeUInt32LE(totalSize - 8, 4);
    buf.write("WAVE", 8);

    // fmt chunk
    buf.write("fmt ", 12);
    buf.writeUInt32LE(16, 16); // chunk size
    buf.writeUInt16LE(1, 20); // PCM format
    buf.writeUInt16LE(channels, 22);
    buf.writeUInt32LE(sampleRate, 24);
    buf.writeUInt32LE(sampleRate * channels * bytesPerSample, 28); // byte rate
    buf.writeUInt16LE(channels * bytesPerSample, 32); // block align
    buf.writeUInt16LE(bitsPerSample, 34);

    // data chunk
    buf.write("data", 36);
    buf.writeUInt32LE(dataSize, 40);
    for (let i = 0; i < opts.samples.length; i++) {
      buf.writeInt16LE(opts.samples[i], 44 + i * bytesPerSample);
    }

    return buf;
  }

  it("should parse a mono 16-bit WAV with known samples", () => {
    // 16384 / 32768 = 0.5, -16384 / 32768 = -0.5
    const wavBuf = buildWavBuffer({ samples: [16384, -16384, 0] });
    const result = parseWavSamples(wavBuf);

    expect(result.sampleRate).toBe(44100);
    expect(result.samples).toHaveLength(3);
    expect(result.samples[0]).toBeCloseTo(0.5, 4);
    expect(result.samples[1]).toBeCloseTo(-0.5, 4);
    expect(result.samples[2]).toBeCloseTo(0, 4);
  });

  it("should parse a stereo WAV and average channels to mono", () => {
    // stereo: L=32767, R=0 → avg = (1.0 + 0.0) / 2 = 0.5
    const wavBuf = buildWavBuffer({
      channels: 2,
      samples: [32767, 0], // one frame: left + right
    });
    const result = parseWavSamples(wavBuf);

    expect(result.samples).toHaveLength(1);
    expect(result.samples[0]).toBeCloseTo(0.5, 1);
  });

  it("should return empty samples for a buffer with no data chunk", () => {
    // Just a RIFF header + fmt chunk, no data chunk
    const buf = Buffer.alloc(36);
    buf.write("RIFF", 0);
    buf.writeUInt32LE(28, 4);
    buf.write("WAVE", 8);
    buf.write("fmt ", 12);
    buf.writeUInt32LE(16, 16);
    buf.writeUInt16LE(1, 20);
    buf.writeUInt16LE(1, 22);
    buf.writeUInt32LE(44100, 24);
    buf.writeUInt32LE(88200, 28);
    buf.writeUInt16LE(2, 32);
    buf.writeUInt16LE(16, 34);

    const result = parseWavSamples(buf);
    expect(result.samples).toEqual([]);
    expect(result.sampleRate).toBe(44100);
  });

  it("should read the sample rate from the fmt chunk", () => {
    const wavBuf = buildWavBuffer({ sampleRate: 16000, samples: [0] });
    const result = parseWavSamples(wavBuf);
    expect(result.sampleRate).toBe(16000);
  });
});

describe("generateCueSamples", () => {
  it("should return empty array for 'none'", () => {
    expect(generateCueSamples("none", 44100)).toEqual([]);
  });

  it("should generate samples within [-1, 1] range for click", () => {
    const samples = generateCueSamples("click", 44100);
    expect(samples.length).toBeGreaterThan(0);
    for (const s of samples) {
      expect(s).toBeGreaterThanOrEqual(-1);
      expect(s).toBeLessThanOrEqual(1);
    }
  });

  it("should generate samples within [-1, 1] range for beep", () => {
    const samples = generateCueSamples("beep", 44100);
    expect(samples.length).toBeGreaterThan(0);
    for (const s of samples) {
      expect(s).toBeGreaterThanOrEqual(-1);
      expect(s).toBeLessThanOrEqual(1);
    }
  });

  it("should generate samples within [-1, 1] range for chime", () => {
    const samples = generateCueSamples("chime", 44100);
    expect(samples.length).toBeGreaterThan(0);
    for (const s of samples) {
      expect(s).toBeGreaterThanOrEqual(-1);
      expect(s).toBeLessThanOrEqual(1);
    }
  });

  it("should return empty array for wav-based cue types", () => {
    // wav-based cues like 'tap' are loaded from files, not generated
    expect(generateCueSamples("tap", 44100)).toEqual([]);
  });

  it("should scale sample count with sample rate", () => {
    const at44100 = generateCueSamples("beep", 44100);
    const at22050 = generateCueSamples("beep", 22050);
    // beep duration is 0.15s, so sample count should roughly halve
    expect(at22050.length).toBeCloseTo(at44100.length / 2, -1);
  });
});
