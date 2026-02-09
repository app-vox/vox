import { describe, it, expect, vi, beforeEach } from "vitest";
import { Pipeline } from "../../src/main/pipeline";
import { type LlmProvider } from "../../src/main/llm/provider";

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

    await expect(pipeline.startRecording()).rejects.toThrow("No Whisper model available");
  });
});
