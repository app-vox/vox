import { describe, it, expect, vi, beforeEach } from "vitest";
import { Pipeline } from "../../src/main/pipeline";
import { type LlmProvider } from "../../src/main/llm/provider";

// Mock electron-log
vi.mock("electron-log/main", () => ({
  default: {
    scope: vi.fn().mockReturnValue({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      verbose: vi.fn(),
    }),
  },
}));

// Mock fs module
vi.mock("fs", () => ({
  existsSync: vi.fn().mockReturnValue(true),
}));

describe("Pipeline", () => {
  const mockRecorder = {
    start: vi.fn(),
    stop: vi.fn().mockResolvedValue({
      audioBuffer: new Float32Array([0.1, 0.2]),
      sampleRate: 16000,
    }),
  };

  const mockTranscribe = vi.fn().mockResolvedValue({ text: "raw transcription" });

  const mockProvider: LlmProvider = {
    correct: vi.fn().mockResolvedValue("corrected text"),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset mock to return true by default
    const fs = await import("fs");
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  it("should run the full pipeline: record -> transcribe -> correct", async () => {
    const pipeline = new Pipeline({
      recorder: mockRecorder,
      transcribe: mockTranscribe,
      llmProvider: mockProvider,
      modelPath: "/models/ggml-small.bin",
    });

    await pipeline.startRecording();
    const result = await pipeline.stopAndProcess();

    expect(mockRecorder.start).toHaveBeenCalled();
    expect(mockRecorder.stop).toHaveBeenCalled();
    expect(mockTranscribe).toHaveBeenCalled();
    expect(mockProvider.correct).toHaveBeenCalledWith("raw transcription");
    expect(result).toBe("corrected text");
  });

  it("should fall back to raw text if LLM correction fails", async () => {
    const failingProvider: LlmProvider = {
      correct: vi.fn().mockRejectedValue(new Error("LLM unavailable")),
    };

    const pipeline = new Pipeline({
      recorder: mockRecorder,
      transcribe: mockTranscribe,
      llmProvider: failingProvider,
      modelPath: "/models/ggml-small.bin",
    });

    await pipeline.startRecording();
    const result = await pipeline.stopAndProcess();

    expect(result).toBe("raw transcription");
  });

  it("should throw NoModelError when model file does not exist", async () => {
    // Mock existsSync to return false for this test
    const fs = await import("fs");
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const pipeline = new Pipeline({
      recorder: mockRecorder,
      transcribe: mockTranscribe,
      llmProvider: mockProvider,
      modelPath: "/fake/nonexistent/model.bin",
      onStage: vi.fn(),
    });

    await expect(pipeline.startRecording()).rejects.toThrow("Please configure local model in Settings");
  });

  it("should call onComplete with text, originalText, and audioDurationMs on success", async () => {
    const onComplete = vi.fn();

    const pipeline = new Pipeline({
      recorder: mockRecorder,
      transcribe: mockTranscribe,
      llmProvider: mockProvider,
      modelPath: "/models/ggml-small.bin",
      onComplete,
    });

    await pipeline.startRecording();
    await pipeline.stopAndProcess();

    expect(onComplete).toHaveBeenCalledWith({
      text: "corrected text",
      originalText: "raw transcription",
      audioDurationMs: expect.any(Number),
    });
  });

  it("should not call onComplete when transcription is empty", async () => {
    const onComplete = vi.fn();
    const emptyTranscribe = vi.fn().mockResolvedValue({ text: "" });

    const pipeline = new Pipeline({
      recorder: mockRecorder,
      transcribe: emptyTranscribe,
      llmProvider: mockProvider,
      modelPath: "/models/ggml-small.bin",
      onComplete,
    });

    await pipeline.startRecording();
    await pipeline.stopAndProcess();

    expect(onComplete).not.toHaveBeenCalled();
  });

  it("should not call onComplete when operation is canceled", async () => {
    const onComplete = vi.fn();

    const pipeline = new Pipeline({
      recorder: {
        start: vi.fn(),
        stop: vi.fn().mockResolvedValue({
          audioBuffer: new Float32Array([0.1, 0.2]),
          sampleRate: 16000,
        }),
        cancel: vi.fn(),
      },
      transcribe: mockTranscribe,
      llmProvider: mockProvider,
      modelPath: "/models/ggml-small.bin",
      onComplete,
    });

    await pipeline.startRecording();
    await pipeline.cancel();

    await expect(pipeline.stopAndProcess()).rejects.toThrow("Operation was canceled");
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("should track analytics events through the pipeline", async () => {
    const mockAnalytics = { track: vi.fn() };

    const pipeline = new Pipeline({
      recorder: mockRecorder,
      transcribe: mockTranscribe,
      llmProvider: mockProvider,
      modelPath: "/models/ggml-small.bin",
      analytics: mockAnalytics,
    });

    await pipeline.startRecording();
    await pipeline.stopAndProcess();

    const events = mockAnalytics.track.mock.calls.map((c) => c[0]);
    expect(events).toContain("transcription_started");
    expect(events).toContain("transcription_completed");
    expect(events).toContain("llm_enhancement_started");
    expect(events).toContain("llm_enhancement_completed");
  });

  it("should track llm_enhancement_skipped when using NoopProvider", async () => {
    const { NoopProvider } = await import("../../src/main/llm/noop");
    const mockAnalytics = { track: vi.fn() };

    const pipeline = new Pipeline({
      recorder: mockRecorder,
      transcribe: mockTranscribe,
      llmProvider: new NoopProvider(),
      modelPath: "/models/ggml-small.bin",
      analytics: mockAnalytics,
    });

    await pipeline.startRecording();
    await pipeline.stopAndProcess();

    const events = mockAnalytics.track.mock.calls.map((c) => c[0]);
    expect(events).toContain("llm_enhancement_skipped");
    expect(events).not.toContain("llm_enhancement_started");
  });

  it("should enter canceling state via gracefulCancel", async () => {
    const onStage = vi.fn();
    const pipeline = new Pipeline({
      recorder: {
        start: vi.fn(),
        stop: vi.fn().mockResolvedValue({
          audioBuffer: new Float32Array([0.1, 0.2]),
          sampleRate: 16000,
        }),
        cancel: vi.fn(),
      },
      transcribe: mockTranscribe,
      llmProvider: mockProvider,
      modelPath: "/models/ggml-small.bin",
      onStage,
    });

    await pipeline.startRecording();
    const cancelResult = pipeline.gracefulCancel();

    expect(cancelResult.stage).toBe("listening");
    expect(pipeline.isCanceling()).toBe(true);
  });

  it("should resume pipeline from listening when undo is called", async () => {
    const onComplete = vi.fn();
    const recorder = {
      start: vi.fn(),
      stop: vi.fn().mockResolvedValue({
        audioBuffer: new Float32Array([0.1, 0.2]),
        sampleRate: 16000,
      }),
      cancel: vi.fn(),
    };

    const pipeline = new Pipeline({
      recorder,
      transcribe: mockTranscribe,
      llmProvider: mockProvider,
      modelPath: "/models/ggml-small.bin",
      onComplete,
    });

    await pipeline.startRecording();
    pipeline.gracefulCancel();

    // Wait for the recorder.stop() in gracefulCancel to resolve
    await vi.waitFor(() => expect(recorder.stop).toHaveBeenCalled());

    const result = await pipeline.undoCancel();

    expect(result).toBe("corrected text");
    expect(onComplete).toHaveBeenCalled();
  });

  it("should fully discard when confirmCancel is called", async () => {
    const recorder = {
      start: vi.fn(),
      stop: vi.fn().mockResolvedValue({
        audioBuffer: new Float32Array([0.1, 0.2]),
        sampleRate: 16000,
      }),
      cancel: vi.fn(),
    };

    const pipeline = new Pipeline({
      recorder,
      transcribe: mockTranscribe,
      llmProvider: mockProvider,
      modelPath: "/models/ggml-small.bin",
    });

    await pipeline.startRecording();
    pipeline.gracefulCancel();
    pipeline.confirmCancel();

    expect(pipeline.isCanceling()).toBe(false);
  });

  it("should track llm_enhancement_failed when LLM errors", async () => {
    const failingProvider: LlmProvider = {
      correct: vi.fn().mockRejectedValue(new Error("LLM unavailable")),
    };
    const mockAnalytics = { track: vi.fn() };

    const pipeline = new Pipeline({
      recorder: mockRecorder,
      transcribe: mockTranscribe,
      llmProvider: failingProvider,
      modelPath: "/models/ggml-small.bin",
      analytics: mockAnalytics,
    });

    await pipeline.startRecording();
    await pipeline.stopAndProcess();

    const events = mockAnalytics.track.mock.calls.map((c) => c[0]);
    expect(events).toContain("llm_enhancement_started");
    expect(events).toContain("llm_enhancement_failed");
  });
});
