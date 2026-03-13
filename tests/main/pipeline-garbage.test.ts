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

  function createPipeline(transcriptionText: string | string[]) {
    const texts = Array.isArray(transcriptionText) ? transcriptionText : [transcriptionText];
    let callIndex = 0;
    return new Pipeline({
      recorder: {
        start: vi.fn(),
        stop: vi.fn().mockResolvedValue({
          audioBuffer: new Float32Array([0.1, 0.2, 0.3]),
          sampleRate: 16000,
        }),
      },
      transcribe: vi.fn().mockImplementation(() => {
        const text = texts[Math.min(callIndex++, texts.length - 1)];
        return Promise.resolve({ text });
      }),
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

  describe("hallucination loop detection", () => {
    it("should reject sentence-level repetition loops", async () => {
      const repeated = "Please subscribe to our channel. ".repeat(28).trim();
      const pipeline = createPipeline(repeated);
      await pipeline.startRecording();
      const result = await pipeline.stopAndProcess();

      expect(result).toBe("");
      expect(mockProvider.correct).not.toHaveBeenCalled();
    });

    it("should reject repetition loops without trailing punctuation", async () => {
      const repeated = Array(10).fill("Thank you for watching").join(". ");
      const pipeline = createPipeline(repeated);
      await pipeline.startRecording();
      const result = await pipeline.stopAndProcess();

      expect(result).toBe("");
      expect(mockProvider.correct).not.toHaveBeenCalled();
    });

    it("should reject n-gram repetition loops (partial sentence loops)", async () => {
      const repeated = "hello world test hello world test hello world test hello world test hello world test hello world test hello world test hello world test";
      const pipeline = createPipeline(repeated);
      await pipeline.startRecording();
      const result = await pipeline.stopAndProcess();

      expect(result).toBe("");
      expect(mockProvider.correct).not.toHaveBeenCalled();
    });

    it("should allow text with some natural repetition", async () => {
      const pipeline = createPipeline(
        "I went to the store. The store was closed. Then I went to the other store and it was open."
      );
      await pipeline.startRecording();
      const result = await pipeline.stopAndProcess();

      expect(result).toBe("corrected");
      expect(mockProvider.correct).toHaveBeenCalled();
    });

    it("should allow two repeated sentences (below threshold)", async () => {
      const pipeline = createPipeline(
        "Testing one two three. Testing one two three. But then something different happened."
      );
      await pipeline.startRecording();
      const result = await pipeline.stopAndProcess();

      expect(result).toBe("corrected");
      expect(mockProvider.correct).toHaveBeenCalled();
    });
  });

  describe("hallucination loop retry with temperature", () => {
    it("should retry with higher temperature when loop detected, and succeed on retry", async () => {
      const loopText = "Please subscribe to our channel. ".repeat(10).trim();
      const goodText = "I need to schedule a meeting for tomorrow";
      // First call returns loop, second call (retry with temp 0.4) returns good text
      const pipeline = createPipeline([loopText, goodText]);
      await pipeline.startRecording();
      const result = await pipeline.stopAndProcess();

      expect(result).toBe("corrected");
      expect(mockProvider.correct).toHaveBeenCalledWith(goodText);
    });

    it("should retry up to 2 times with increasing temperature", async () => {
      const loopText = "Please subscribe to our channel. ".repeat(10).trim();
      const goodText = "The meeting is at three PM in the conference room";
      // First call: loop, second call (temp 0.4): still loop, third call (temp 0.8): success
      const pipeline = createPipeline([loopText, loopText, goodText]);
      await pipeline.startRecording();
      const result = await pipeline.stopAndProcess();

      expect(result).toBe("corrected");
      expect(mockProvider.correct).toHaveBeenCalledWith(goodText);
    });

    it("should give up after all retries fail and return empty", async () => {
      const loopText = "Please subscribe to our channel. ".repeat(10).trim();
      // All 3 calls (original + 2 retries) return garbage
      const pipeline = createPipeline([loopText, loopText, loopText]);
      await pipeline.startRecording();
      const result = await pipeline.stopAndProcess();

      expect(result).toBe("");
      expect(mockProvider.correct).not.toHaveBeenCalled();
    });

    it("should not retry for non-loop garbage types", async () => {
      const transcribeFn = vi.fn().mockResolvedValue({ text: "thank you" });
      const pipeline = new Pipeline({
        recorder: {
          start: vi.fn(),
          stop: vi.fn().mockResolvedValue({
            audioBuffer: new Float32Array([0.1, 0.2, 0.3]),
            sampleRate: 16000,
          }),
        },
        transcribe: transcribeFn,
        llmProvider: mockProvider,
        modelPath: "/models/ggml-small.bin",
      });
      await pipeline.startRecording();
      await pipeline.stopAndProcess();

      // Should only be called once (no retries for known hallucinations)
      expect(transcribeFn).toHaveBeenCalledTimes(1);
    });

    it("should track analytics for retry attempts", async () => {
      const loopText = "Please subscribe to our channel. ".repeat(10).trim();
      const goodText = "I need to schedule a meeting for tomorrow";
      const mockAnalytics = { track: vi.fn() };
      let callIndex = 0;
      const texts = [loopText, goodText];
      const pipeline = new Pipeline({
        recorder: {
          start: vi.fn(),
          stop: vi.fn().mockResolvedValue({
            audioBuffer: new Float32Array([0.1, 0.2, 0.3]),
            sampleRate: 16000,
          }),
        },
        transcribe: vi.fn().mockImplementation(() => {
          const text = texts[Math.min(callIndex++, texts.length - 1)];
          return Promise.resolve({ text });
        }),
        llmProvider: mockProvider,
        modelPath: "/models/ggml-small.bin",
        analytics: mockAnalytics,
      });

      await pipeline.startRecording();
      await pipeline.stopAndProcess();

      const events = mockAnalytics.track.mock.calls.map((c) => c[0]);
      expect(events).toContain("transcription_loop_retry");
      expect(events).toContain("transcription_loop_retry_succeeded");
    });
  });

  describe("real-world regression cases", () => {
    it("should catch the exact Whisper output from the 81-second hallucination loop", async () => {
      // Real output from whisper.cpp medium model on an 81-second Portuguese audio
      // recording. The model latched onto "Transcribe" from the prompt and looped.
      const realWhisperOutput = "Transcribe em estático. ".repeat(28).trim();
      const pipeline = createPipeline(realWhisperOutput);
      await pipeline.startRecording();
      const result = await pipeline.stopAndProcess();

      expect(result).toBe("");
      expect(mockProvider.correct).not.toHaveBeenCalled();
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
