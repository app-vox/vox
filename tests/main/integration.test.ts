import { describe, it, expect, vi } from "vitest";
import { Pipeline } from "../../src/main/pipeline";
import { NoopProvider } from "../../src/main/llm/noop";
import { FoundryProvider } from "../../src/main/llm/foundry";
import { createLlmProvider } from "../../src/main/llm/factory";
import { createDefaultConfig } from "../../src/shared/config";

describe("Whisper-only mode integration", () => {
  it("should complete full pipeline without LLM when disabled", async () => {
    const config = createDefaultConfig();
    config.enableLlmEnhancement = false;

    const mockRecorder = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue({
        audioBuffer: new Float32Array([0.1, 0.2, 0.3]),
        sampleRate: 16000,
      }),
    };

    const mockTranscribe = vi.fn().mockResolvedValue({
      text: "this is a test transcription",
    });

    const stagesSeen: string[] = [];
    const onStage = (stage: string) => stagesSeen.push(stage);

    const provider = createLlmProvider(config);
    expect(provider).toBeInstanceOf(NoopProvider);

    const pipeline = new Pipeline({
      recorder: mockRecorder,
      transcribe: mockTranscribe,
      llmProvider: provider,
      modelPath: "/fake/path",
      onStage,
    });

    await pipeline.startRecording();
    const result = await pipeline.stopAndProcess();

    expect(result).toBe("this is a test transcription");
    expect(stagesSeen).toEqual(["transcribing"]);
    expect(stagesSeen).not.toContain("correcting");
  });

  it("should complete full pipeline with LLM when enabled", async () => {
    const config = createDefaultConfig();
    config.enableLlmEnhancement = true;
    config.llm.endpoint = "https://api.example.com";
    config.llm.apiKey = "test-key";

    const mockRecorder = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue({
        audioBuffer: new Float32Array([0.1, 0.2, 0.3]),
        sampleRate: 16000,
      }),
    };

    const mockTranscribe = vi.fn().mockResolvedValue({
      text: "this is a test transcription",
    });

    const stagesSeen: string[] = [];
    const onStage = (stage: string) => stagesSeen.push(stage);

    const provider = createLlmProvider(config);
    expect(provider).toBeInstanceOf(FoundryProvider);

    const pipeline = new Pipeline({
      recorder: mockRecorder,
      transcribe: mockTranscribe,
      llmProvider: provider,
      modelPath: "/fake/path",
      onStage,
    });

    await pipeline.startRecording();

    // Mock the LLM call to avoid network
    vi.spyOn(provider, "correct").mockResolvedValue("corrected transcription");

    const result = await pipeline.stopAndProcess();

    expect(result).toBe("corrected transcription");
    expect(stagesSeen).toEqual(["transcribing", "correcting"]);
  });
});
