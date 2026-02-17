import { describe, it, expect, vi, beforeEach } from "vitest";
import { Pipeline } from "../../src/main/pipeline";
import { type LlmProvider } from "../../src/main/llm/provider";

vi.mock("electron-log/main", () => ({
  default: {
    scope: vi.fn().mockReturnValue({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

vi.mock("fs", () => ({
  existsSync: vi.fn().mockReturnValue(true),
}));

/**
 * Tests for the garbage/hallucination detection logic in Pipeline.
 *
 * Whisper commonly hallucinates phrases when fed silence or background noise.
 * The pipeline filters these out before sending to the LLM provider.
 * These tests ensure the filter works correctly without being coupled to
 * implementation details — they test through the public stopAndProcess API.
 */
describe("Pipeline garbage/hallucination detection", () => {
  const mockProvider: LlmProvider = {
    correct: vi.fn().mockResolvedValue("corrected"),
  };

  function createPipeline(transcriptionText: string) {
    return new Pipeline({
      recorder: {
        start: vi.fn(),
        stop: vi.fn().mockResolvedValue({
          audioBuffer: new Float32Array([0.1, 0.2, 0.3]),
          sampleRate: 16000,
        }),
      },
      transcribe: vi.fn().mockResolvedValue({ text: transcriptionText }),
      llmProvider: mockProvider,
      modelPath: "/models/ggml-small.bin",
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("common Whisper hallucinations", () => {
    it.each([
      "thank you",
      "thanks for watching",
      "bye",
      "subscribe",
      "like and subscribe",
      "thank you so much",
      "the end",
      "...",
      "ok",
      "yeah",
      "um",
      "uh",
    ])("should reject known hallucination: %j", async (hallucination) => {
      const pipeline = createPipeline(hallucination);
      await pipeline.startRecording();
      const result = await pipeline.stopAndProcess();

      expect(result).toBe("");
      expect(mockProvider.correct).not.toHaveBeenCalled();
    });
  });

  describe("short text rejection", () => {
    it("should reject very short transcriptions (< 5 chars)", async () => {
      const pipeline = createPipeline("hi");
      await pipeline.startRecording();
      const result = await pipeline.stopAndProcess();

      expect(result).toBe("");
      expect(mockProvider.correct).not.toHaveBeenCalled();
    });
  });

  describe("bracketed sound descriptions", () => {
    it("should reject text that is only bracketed descriptions", async () => {
      const pipeline = createPipeline("[BLANK_AUDIO]");
      await pipeline.startRecording();
      const result = await pipeline.stopAndProcess();

      expect(result).toBe("");
    });

    it("should reject text that is only parenthesized descriptions", async () => {
      const pipeline = createPipeline("(machine whirring)");
      await pipeline.startRecording();
      const result = await pipeline.stopAndProcess();

      expect(result).toBe("");
    });

    it("should reject text that is only asterisk descriptions", async () => {
      const pipeline = createPipeline("*music playing*");
      await pipeline.startRecording();
      const result = await pipeline.stopAndProcess();

      expect(result).toBe("");
    });
  });

  describe("repetitive character detection", () => {
    it("should reject text with a single character making up >50% of content", async () => {
      const pipeline = createPipeline("aaaaaaaab");
      await pipeline.startRecording();
      const result = await pipeline.stopAndProcess();

      expect(result).toBe("");
    });

    it("should reject long text with very low character diversity", async () => {
      // 20+ chars but only 2 distinct characters
      const pipeline = createPipeline("ababababababababababab");
      await pipeline.startRecording();
      const result = await pipeline.stopAndProcess();

      expect(result).toBe("");
    });
  });

  describe("valid transcriptions should pass", () => {
    it("should allow normal speech through to LLM", async () => {
      const pipeline = createPipeline("I need to schedule a meeting for tomorrow");
      await pipeline.startRecording();
      const result = await pipeline.stopAndProcess();

      expect(result).toBe("corrected");
      expect(mockProvider.correct).toHaveBeenCalledWith("I need to schedule a meeting for tomorrow");
    });

    it("should allow short but valid sentences", async () => {
      const pipeline = createPipeline("Hello world test");
      await pipeline.startRecording();
      const result = await pipeline.stopAndProcess();

      expect(result).toBe("corrected");
      expect(mockProvider.correct).toHaveBeenCalled();
    });

    it("should allow text with mixed brackets and real content", async () => {
      const pipeline = createPipeline("(laughing) That was really funny and I loved it");
      await pipeline.startRecording();
      const result = await pipeline.stopAndProcess();

      expect(result).toBe("corrected");
    });
  });

  describe("empty transcription", () => {
    it("should return empty string for empty transcription", async () => {
      const pipeline = createPipeline("");
      await pipeline.startRecording();
      const result = await pipeline.stopAndProcess();

      expect(result).toBe("");
      expect(mockProvider.correct).not.toHaveBeenCalled();
    });

    it("should return empty string for whitespace-only transcription", async () => {
      const pipeline = createPipeline("   ");
      await pipeline.startRecording();
      const result = await pipeline.stopAndProcess();

      expect(result).toBe("");
    });
  });
});
