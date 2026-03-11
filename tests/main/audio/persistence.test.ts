import { describe, it, expect, vi, beforeEach } from "vitest";
import * as path from "path";

// Mock electron
vi.mock("electron", () => ({
  app: {
    getPath: vi.fn().mockReturnValue("/mock/userData"),
    getAppPath: vi.fn().mockReturnValue("/mock/appPath"),
  },
}));

// Mock electron-log/main
vi.mock("electron-log/main", () => ({
  default: {
    scope: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

// Mock child_process (needed by whisper.ts import)
vi.mock("child_process", () => ({
  execFile: vi.fn(),
}));

// Mock fs module
vi.mock("fs", async () => {
  const actual = await vi.importActual<typeof import("fs")>("fs");
  return {
    ...actual,
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    existsSync: vi.fn().mockReturnValue(false),
    unlinkSync: vi.fn(),
    readFileSync: vi.fn(),
    readdirSync: vi.fn().mockReturnValue([]),
  };
});

import * as fs from "fs";
import {
  getAudioDir,
  saveAudioFile,
  deleteAudioFile,
  decodeWavFile,
  cleanupOrphanedAudioFiles,
} from "../../../src/main/audio/persistence";
import { encodeWav } from "../../../src/main/audio/whisper";

describe("AudioPersistence", () => {
  beforeEach(() => {
    vi.mocked(fs.mkdirSync).mockReset();
    vi.mocked(fs.writeFileSync).mockReset();
    vi.mocked(fs.existsSync).mockReset().mockReturnValue(false);
    vi.mocked(fs.unlinkSync).mockReset();
    vi.mocked(fs.readFileSync).mockReset();
    vi.mocked(fs.readdirSync).mockReset().mockReturnValue([]);
  });

  describe("getAudioDir", () => {
    it("should return the audio directory path under userData", () => {
      const result = getAudioDir();
      expect(result).toBe(path.join("/mock/userData", "audio"));
    });
  });

  describe("saveAudioFile", () => {
    it("should create directory and write WAV file", () => {
      const audioBuffer = new Float32Array([0.1, -0.2, 0.3, -0.4]);
      const sampleRate = 16000;
      const entryId = "test-entry-123";

      const result = saveAudioFile(audioBuffer, sampleRate, entryId);

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        path.join("/mock/userData", "audio"),
        { recursive: true },
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        path.join("/mock/userData", "audio", "test-entry-123.wav"),
        expect.any(Buffer),
      );
      expect(result).toBe(path.join("/mock/userData", "audio", "test-entry-123.wav"));
    });
  });

  describe("deleteAudioFile", () => {
    it("should delete an existing file", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      deleteAudioFile("/mock/userData/audio/test.wav");

      expect(fs.unlinkSync).toHaveBeenCalledWith("/mock/userData/audio/test.wav");
    });

    it("should not attempt to delete a missing file", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      deleteAudioFile("/mock/userData/audio/missing.wav");

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it("should not throw when unlinkSync fails", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.unlinkSync).mockImplementation(() => {
        throw new Error("permission denied");
      });

      expect(() => deleteAudioFile("/mock/userData/audio/test.wav")).not.toThrow();
    });
  });

  describe("decodeWavFile", () => {
    it("should round-trip correctly with encodeWav", () => {
      const original = new Float32Array([0.5, -0.5, 0.25, -0.25, 0.0]);
      const sampleRate = 16000;

      const wavBuffer = encodeWav(original, sampleRate);
      vi.mocked(fs.readFileSync).mockReturnValue(wavBuffer);

      const result = decodeWavFile("/fake/path.wav");

      expect(result.sampleRate).toBe(sampleRate);
      expect(result.audioBuffer.length).toBe(original.length);

      // 16-bit quantization introduces small rounding errors, so check with tolerance
      for (let i = 0; i < original.length; i++) {
        expect(result.audioBuffer[i]).toBeCloseTo(original[i], 3);
      }
    });

    it("should correctly decode sample rate from WAV header", () => {
      const samples = new Float32Array([0.1, 0.2]);
      const sampleRate = 44100;

      const wavBuffer = encodeWav(samples, sampleRate);
      vi.mocked(fs.readFileSync).mockReturnValue(wavBuffer);

      const result = decodeWavFile("/fake/path.wav");
      expect(result.sampleRate).toBe(44100);
    });
  });

  describe("cleanupOrphanedAudioFiles", () => {
    it("should remove files not in the valid IDs set", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        "keep-1.wav" as unknown as fs.Dirent,
        "keep-2.wav" as unknown as fs.Dirent,
        "orphan-1.wav" as unknown as fs.Dirent,
        "orphan-2.wav" as unknown as fs.Dirent,
      ]);

      const validIds = new Set(["keep-1", "keep-2"]);
      cleanupOrphanedAudioFiles(validIds);

      expect(fs.unlinkSync).toHaveBeenCalledTimes(2);
      expect(fs.unlinkSync).toHaveBeenCalledWith(
        path.join("/mock/userData", "audio", "orphan-1.wav"),
      );
      expect(fs.unlinkSync).toHaveBeenCalledWith(
        path.join("/mock/userData", "audio", "orphan-2.wav"),
      );
    });

    it("should do nothing when audio directory does not exist", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      cleanupOrphanedAudioFiles(new Set(["id-1"]));

      expect(fs.readdirSync).not.toHaveBeenCalled();
    });

    it("should keep all files when all IDs are valid", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        "id-1.wav" as unknown as fs.Dirent,
        "id-2.wav" as unknown as fs.Dirent,
      ]);

      cleanupOrphanedAudioFiles(new Set(["id-1", "id-2"]));

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });
  });
});
