import { describe, it, expect, vi } from "vitest";
import { Pipeline } from "../../src/main/pipeline";
import { type LlmProvider } from "../../src/main/llm/provider";
import { NoopProvider } from "../../src/main/llm/noop";

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

  it("should not call onStage('correcting') when using NoopProvider", async () => {
    const onStageSpy = vi.fn();

    const pipeline = new Pipeline({
      recorder: mockRecorder,
      transcribe: mockTranscribe,
      llmProvider: new NoopProvider(),
      modelPath: "/path/to/model",
      onStage: onStageSpy,
    });

    await pipeline.startRecording();
    const result = await pipeline.stopAndProcess();

    expect(onStageSpy).toHaveBeenCalledWith("transcribing");
    expect(onStageSpy).not.toHaveBeenCalledWith("correcting");
    expect(result).toBe("raw transcription");
  });

  it("should call onStage('correcting') with real LLM provider", async () => {
    const onStageSpy = vi.fn();

    const pipeline = new Pipeline({
      recorder: mockRecorder,
      transcribe: mockTranscribe,
      llmProvider: mockProvider,
      modelPath: "/path/to/model",
      onStage: onStageSpy,
    });

    await pipeline.startRecording();
    const result = await pipeline.stopAndProcess();

    expect(onStageSpy).toHaveBeenCalledWith("transcribing");
    expect(onStageSpy).toHaveBeenCalledWith("correcting");
    expect(result).toBe("corrected text");
  });
});
