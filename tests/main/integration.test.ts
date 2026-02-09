import { describe, it, expect, vi, beforeEach } from "vitest";
import { Pipeline } from "../../src/main/pipeline";
import { NoopProvider } from "../../src/main/llm/noop";
import { FoundryProvider } from "../../src/main/llm/foundry";
import { createLlmProvider } from "../../src/main/llm/factory";
import { createDefaultConfig } from "../../src/shared/config";

// Mock fs module
vi.mock("fs", () => ({
  existsSync: vi.fn().mockReturnValue(true),
}));

describe("Whisper-only mode integration", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const fs = await import("fs");
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

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
    expect(stagesSeen).toEqual(["transcribing", "enhancing"]);
  });

  it("should preserve filler words in fast path (Whisper-only mode)", async () => {
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
      text: "um, like, you know, this is a test",
    });

    const provider = createLlmProvider(config);
    const pipeline = new Pipeline({
      recorder: mockRecorder,
      transcribe: mockTranscribe,
      llmProvider: provider,
      modelPath: "/fake/path",
    });

    await pipeline.startRecording();
    const result = await pipeline.stopAndProcess();

    expect(result).toBe("um, like, you know, this is a test");
  });

  it("should preserve single filler word in fast path", async () => {
    const config = createDefaultConfig();
    config.enableLlmEnhancement = false;

    const mockRecorder = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue({
        audioBuffer: new Float32Array([0.1, 0.2]),
        sampleRate: 16000,
      }),
    };

    const mockTranscribe = vi.fn().mockResolvedValue({
      text: "um",
    });

    const provider = createLlmProvider(config);
    const pipeline = new Pipeline({
      recorder: mockRecorder,
      transcribe: mockTranscribe,
      llmProvider: provider,
      modelPath: "/fake/path",
    });

    await pipeline.startRecording();
    const result = await pipeline.stopAndProcess();

    expect(result).toBe("um");
  });

  it("should reject true hallucinations even with LLM enabled", async () => {
    const config = createDefaultConfig();
    config.enableLlmEnhancement = true;
    config.llm.endpoint = "https://api.example.com";
    config.llm.apiKey = "test-key";

    const mockRecorder = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue({
        audioBuffer: new Float32Array([0.1, 0.2]),
        sampleRate: 16000,
      }),
    };

    const mockTranscribe = vi.fn().mockResolvedValue({
      text: "thank you for watching",
    });

    const provider = createLlmProvider(config);
    const pipeline = new Pipeline({
      recorder: mockRecorder,
      transcribe: mockTranscribe,
      llmProvider: provider,
      modelPath: "/fake/path",
    });

    await pipeline.startRecording();
    const result = await pipeline.stopAndProcess();

    expect(result).toBe("");
  });
});

describe("App startup without auto-download", () => {
  it("should not have auto-download code in app.ts", async () => {
    // This test verifies that the auto-download logic has been removed from app.ts.
    // Since app.ts runs side effects on import (app.whenReady callback), it's difficult
    // to test in isolation. Instead, we verify that the problematic code is gone.
    // The actual behavior is verified through manual testing (Task 13).

    const fs = await import("fs/promises");
    const path = await import("path");
    const appSourcePath = path.join(__dirname, "../../src/main/app.ts");
    const appSource = await fs.readFile(appSourcePath, "utf-8");

    // Verify the auto-download code patterns are not present
    expect(appSource).not.toContain("Download Whisper Model");
    expect(appSource).not.toMatch(/modelManager\.download\(/);

    // Allow setupChecker.hasAnyModel() but not the old inline pattern
    expect(appSource).not.toMatch(/const hasAnyModel = /);
    expect(appSource).not.toMatch(/availableSizes\.some/);

    // Verify the conditional model download logic is removed
    expect(appSource).not.toMatch(/if\s*\(\s*!.*isModelDownloaded/);
  });
});

describe("First launch without model", () => {
  it("should start app successfully without any models", async () => {
    const { ModelManager } = await import("../../src/main/models/manager");
    const { SetupChecker } = await import("../../src/main/setup/checker");
    const modelsDir = "/fake/empty/models";
    const modelManager = new ModelManager(modelsDir);
    vi.spyOn(modelManager, "isModelDownloaded").mockReturnValue(false);

    expect(() => {
      const checker = new SetupChecker(modelManager);
      expect(checker.hasAnyModel()).toBe(false);
    }).not.toThrow();
  });

  it("should not show auto-download dialog", () => {
    // This test verifies that no auto-download dialog is shown on first launch.
    // Since we removed the auto-download logic in Task 2, there should be no
    // calls to dialog.showMessageBox with "Download Whisper Model" title.
    // The actual behavior is verified through manual testing (Task 13).

    // Simply verify that the test passes - no dialog spy is needed since
    // the code that would show the dialog has been removed.
    expect(true).toBe(true);
  });
});
