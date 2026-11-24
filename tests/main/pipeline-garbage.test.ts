import { describe, it, expect, vi, beforeEach } from "vitest";
import { CanceledError, Pipeline, type PipelineDeps } from "../../src/main/pipeline";
import { type LlmProvider } from "../../src/main/llm/provider";
import { createDefaultConfig } from "../../src/shared/config";
import { detectGarbage } from "../../src/main/garbage";
import { deferred } from "./helpers/chunking";

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

describe("Pipeline garbage/hallucination detection", () => {
  const mockProvider: LlmProvider = {
    correct: vi.fn().mockResolvedValue("corrected"),
  };

  function createPipeline(transcriptionText: string | string[], onComplete?: PipelineDeps["onComplete"]) {
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
      loadConfig: createDefaultConfig,
      createLlmProvider: () => mockProvider,
      onComplete,
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
      const pipeline = createPipeline("ababababababababababab");
      await pipeline.startRecording();
      const result = await pipeline.stopAndProcess();

      expect(result).toBe("");
    });
  });

  describe("hallucination loop detection", () => {
    it("should collapse a sentence-level repetition loop and send it to the LLM", async () => {
      const repeated = "Please subscribe to our channel. ".repeat(28).trim();
      const pipeline = createPipeline(repeated);
      await pipeline.startRecording();
      const result = await pipeline.stopAndProcess();

      expect(detectGarbage(repeated)).toBe("loop");
      expect(result).toBe("corrected");
      expect(mockProvider.correct).toHaveBeenCalledWith("Please subscribe to our channel.");
    });

    it("should collapse a repetition loop without trailing punctuation and send it to the LLM", async () => {
      const repeated = Array(10).fill("Thank you for watching").join(". ");
      const pipeline = createPipeline(repeated);
      await pipeline.startRecording();
      const result = await pipeline.stopAndProcess();

      expect(detectGarbage(repeated)).toBe("loop");
      expect(result).toBe("corrected");
      expect(mockProvider.correct).toHaveBeenCalledWith("Thank you for watching.");
    });

    it("should collapse an n-gram repetition loop (partial sentence loop) and send it to the LLM", async () => {
      const repeated = "hello world test hello world test hello world test hello world test hello world test hello world test hello world test hello world test";
      const pipeline = createPipeline(repeated);
      await pipeline.startRecording();
      const result = await pipeline.stopAndProcess();

      expect(detectGarbage(repeated)).toBe("loop");
      expect(result).toBe("corrected");
      expect(mockProvider.correct).toHaveBeenCalledWith("hello world test");
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
      const pipeline = createPipeline([loopText, goodText]);
      await pipeline.startRecording();
      const result = await pipeline.stopAndProcess();

      expect(result).toBe("corrected");
      expect(mockProvider.correct).toHaveBeenCalledWith(goodText);
    });

    it("should retry up to 2 times with increasing temperature", async () => {
      const loopText = "Please subscribe to our channel. ".repeat(10).trim();
      const goodText = "The meeting is at three PM in the conference room";
      const pipeline = createPipeline([loopText, loopText, goodText]);
      await pipeline.startRecording();
      const result = await pipeline.stopAndProcess();

      expect(result).toBe("corrected");
      expect(mockProvider.correct).toHaveBeenCalledWith(goodText);
    });

    it("should collapse the loop after all retries fail, send it to the LLM and flag the transcript incomplete", async () => {
      const loopText = "Please subscribe to our channel. ".repeat(10).trim();
      const onComplete = vi.fn();
      const pipeline = createPipeline([loopText, loopText, loopText], onComplete);
      await pipeline.startRecording();
      const result = await pipeline.stopAndProcess();

      expect(detectGarbage(loopText)).toBe("loop");
      expect(result).toBe("corrected");
      expect(mockProvider.correct).toHaveBeenCalledWith("Please subscribe to our channel.");
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete.mock.calls[0][0].incomplete).toBe(true);
      expect(pipeline.lastTranscriptIncomplete()).toBe(true);
    });

    it("should flag the transcript incomplete when the LLM fails on a collapsed loop", async () => {
      const loopText = "Please subscribe to our channel. ".repeat(10).trim();
      vi.mocked(mockProvider.correct).mockRejectedValueOnce(new Error("LLM down"));
      const onComplete = vi.fn();
      const pipeline = createPipeline([loopText, loopText, loopText], onComplete);
      await pipeline.startRecording();
      const result = await pipeline.stopAndProcess();

      expect(result).toBe("Please subscribe to our channel.");
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete.mock.calls[0][0]).toMatchObject({
        text: "Please subscribe to our channel.",
        llmFailed: true,
        incomplete: true,
      });
      expect(pipeline.lastTranscriptIncomplete()).toBe(true);
    });

    it("should keep the transcript flagged incomplete when a cancel at enhancing is undone", async () => {
      const loopText = "Please subscribe to our channel. ".repeat(10).trim();
      const pending = deferred<string>();
      vi.mocked(mockProvider.correct).mockImplementationOnce(() => pending.promise);
      const onComplete = vi.fn();
      const pipeline = createPipeline([loopText, loopText, loopText], onComplete);
      await pipeline.startRecording();
      const processing = pipeline.stopAndProcess();
      await vi.waitFor(() => expect(mockProvider.correct).toHaveBeenCalledTimes(1));

      expect(pipeline.gracefulCancel().stage).toBe("enhancing");
      pending.resolve("discarded");
      await expect(processing).rejects.toBeInstanceOf(CanceledError);
      expect(onComplete).not.toHaveBeenCalled();

      const result = await pipeline.undoCancel();

      expect(result).toBe("corrected");
      expect(mockProvider.correct).toHaveBeenLastCalledWith("Please subscribe to our channel.");
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete.mock.calls[0][0].incomplete).toBe(true);
      expect(pipeline.lastTranscriptIncomplete()).toBe(true);
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
        loadConfig: createDefaultConfig,
        createLlmProvider: () => mockProvider,
        modelPath: "/models/ggml-small.bin",
      });
      await pipeline.startRecording();
      await pipeline.stopAndProcess();

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
        loadConfig: createDefaultConfig,
        createLlmProvider: () => mockProvider,
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
    it("should collapse the exact Whisper output from the 81-second hallucination loop and send it to the LLM", async () => {
      const realWhisperOutput = "Transcribe em estático. ".repeat(28).trim();
      const pipeline = createPipeline(realWhisperOutput);
      await pipeline.startRecording();
      const result = await pipeline.stopAndProcess();

      expect(detectGarbage(realWhisperOutput)).toBe("loop");
      expect(result).toBe("corrected");
      expect(mockProvider.correct).toHaveBeenCalledWith("Transcribe em estático.");
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
