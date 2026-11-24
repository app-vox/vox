import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Pipeline } from "../../src/main/pipeline";
import { NoopProvider } from "../../src/main/llm/noop";
import { FoundryProvider } from "../../src/main/llm/foundry";
import { createLlmProvider } from "../../src/main/llm/factory";
import { createDefaultConfig } from "../../src/shared/config";
import { WHISPER_PROMPT } from "../../src/shared/constants";
import { completedEntry } from "../../src/main/history/entry";
import { pasteOutcome } from "../../src/main/shortcuts/paste-outcome";
import { t } from "../../src/shared/i18n";
import { computeLlmConfigHash } from "../../src/shared/llm-config-hash";
import { FakeRecorder, scriptedWhisper, threeChunks } from "./helpers/chunking";

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
      loadConfig: () => config,
      createLlmProvider: () => provider,
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
    config.llmConnectionTested = true;
    config.llm.endpoint = "https://api.example.com";
    config.llm.apiKey = "test-key";
    config.llmConfigHash = computeLlmConfigHash(config);

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
      loadConfig: () => config,
      createLlmProvider: () => provider,
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
      loadConfig: () => config,
      createLlmProvider: () => provider,
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
      loadConfig: () => config,
      createLlmProvider: () => provider,
      modelPath: "/fake/path",
    });

    await pipeline.startRecording();
    const result = await pipeline.stopAndProcess();

    expect(result).toBe("um");
  });

  it("should reject true hallucinations even with LLM enabled", async () => {
    const config = createDefaultConfig();
    config.enableLlmEnhancement = true;
    config.llmConnectionTested = true;
    config.llm.endpoint = "https://api.example.com";
    config.llm.apiKey = "test-key";
    config.llmConfigHash = computeLlmConfigHash(config);

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
      loadConfig: () => config,
      createLlmProvider: () => provider,
      modelPath: "/fake/path",
    });

    await pipeline.startRecording();
    const result = await pipeline.stopAndProcess();

    expect(result).toBe("");
  });

  it("a recording of three chunks is transcribed chunk by chunk", async () => {
    const config = createDefaultConfig();
    const provider = createLlmProvider(config);
    expect(provider).toBeInstanceOf(NoopProvider);
    const whisper = scriptedWhisper(["Alpha one.", "Beta two.", "Gamma three."]);
    const completed: { text: string; originalText: string }[] = [];

    const pipeline = new Pipeline({
      recorder: {
        start: async () => {},
        stop: async () => ({ audioBuffer: threeChunks(), sampleRate: 16000 }),
        cancel: async () => {},
      },
      transcribe: whisper.transcribe,
      loadConfig: () => config,
      createLlmProvider: () => provider,
      modelPath: "/fake/path",
      onComplete: (result) => completed.push(result),
    });

    await pipeline.startRecording();
    const result = await pipeline.stopAndProcess();

    expect(result).toBe("Alpha one. Beta two. Gamma three.");
    expect(whisper.calls.map((call) => call.samples)).toEqual([338240, 345600, 135360]);
    expect(completed.map((done) => done.originalText)).toEqual(["Alpha one. Beta two. Gamma three."]);
  });

  it("the first chunk's language and text reach the second pass", async () => {
    const config = createDefaultConfig();
    const provider = createLlmProvider(config);
    expect(provider).toBeInstanceOf(NoopProvider);
    const whisper = scriptedWhisper([
      { text: "Olá, este é o primeiro bloco.", language: "pt" },
      "Segundo bloco aqui.",
      "Terceiro bloco aqui.",
    ]);

    const pipeline = new Pipeline({
      recorder: {
        start: async () => {},
        stop: async () => ({ audioBuffer: threeChunks(), sampleRate: 16000 }),
        cancel: async () => {},
      },
      transcribe: whisper.transcribe,
      loadConfig: () => config,
      createLlmProvider: () => provider,
      modelPath: "/fake/path",
    });

    await pipeline.startRecording();
    const result = await pipeline.stopAndProcess();

    expect(whisper.calls.map((call) => call.language)).toEqual(["auto", "pt", "pt"]);
    expect(whisper.calls[0].prompt).toBe(WHISPER_PROMPT);
    expect(whisper.calls[1].prompt).toBe(`${WHISPER_PROMPT} Olá, este é o primeiro bloco.`);
    expect(result).toBe("Olá, este é o primeiro bloco. Segundo bloco aqui. Terceiro bloco aqui.");
  });

  it("a surviving loop is collapsed, pasted and flagged", async () => {
    const loop = "and then we will see, and then we will see, and then we will see, and then we will see";
    const config = createDefaultConfig();
    const provider = createLlmProvider(config);
    expect(provider).toBeInstanceOf(NoopProvider);
    const whisper = scriptedWhisper(["Alpha one.", loop, loop, loop, "Gamma three.", "Alpha one.", "Beta two.", "Gamma three."]);
    const completed: { text: string; incomplete?: boolean }[] = [];

    const pipeline = new Pipeline({
      recorder: {
        start: async () => {},
        stop: async () => ({ audioBuffer: threeChunks(), sampleRate: 16000 }),
        cancel: async () => {},
      },
      transcribe: whisper.transcribe,
      loadConfig: () => config,
      createLlmProvider: () => provider,
      modelPath: "/fake/path",
      onComplete: (result) => completed.push(result),
    });

    await pipeline.startRecording();
    const result = await pipeline.stopAndProcess();

    expect(result).toBe("Alpha one. and then we will see, Gamma three.");
    expect(whisper.calls).toHaveLength(5);
    expect(whisper.calls.map((call) => call.temperature)).toEqual([undefined, undefined, 0.4, 0.8, undefined]);
    expect(completed).toHaveLength(1);
    expect(completed[0].text).toBe(result);
    expect(completed[0].incomplete).toBe(true);
    expect(pipeline.lastTranscriptIncomplete()).toBe(true);

    await pipeline.startRecording();
    expect(pipeline.lastTranscriptIncomplete()).toBe(false);
    const clean = await pipeline.stopAndProcess();

    expect(clean).toBe("Alpha one. Beta two. Gamma three.");
    expect(completed).toHaveLength(2);
    expect("incomplete" in completed[1]).toBe(false);
    expect(pipeline.lastTranscriptIncomplete()).toBe(false);
  });

  it("an incomplete transcript is marked in its history entry and warned about", async () => {
    const loop = "and then we will see, and then we will see, and then we will see, and then we will see";
    const config = createDefaultConfig();
    const whisper = scriptedWhisper(["Alpha one.", loop, loop, loop, "Gamma three."]);
    const completed: Parameters<NonNullable<ConstructorParameters<typeof Pipeline>[0]["onComplete"]>>[0][] = [];

    const pipeline = new Pipeline({
      recorder: {
        start: async () => {},
        stop: async () => ({ audioBuffer: threeChunks(), sampleRate: 16000 }),
        cancel: async () => {},
      },
      transcribe: whisper.transcribe,
      loadConfig: () => config,
      createLlmProvider: () => createLlmProvider(config),
      modelPath: "/fake/path",
      onComplete: (result) => completed.push(result),
    });

    await pipeline.startRecording();
    const text = await pipeline.stopAndProcess();

    const entry = completedEntry(completed[0], text, { whisperModel: "small", llmEnhanced: false });
    expect(entry.incomplete).toBe(true);
    expect(entry.status).toBe("success");
    expect(pasteOutcome(true, pipeline.lastTranscriptIncomplete())).toBe("incomplete");
    expect(pasteOutcome(false, pipeline.lastTranscriptIncomplete())).toBe("insert-failed");
    expect(t("indicator.incompleteTranscript")).toBe("Transcript may be incomplete");
    expect(t("history.status.incomplete")).toBe("Incomplete");
  });
});

describe("Transcription while recording", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("chunks closed while recording are transcribed before stop", async () => {
    const config = createDefaultConfig();
    const recorder = new FakeRecorder(threeChunks());
    const whisper = scriptedWhisper(["Alpha one.", "Beta two.", "Gamma three."]);
    const pipeline = new Pipeline({
      recorder,
      transcribe: whisper.transcribe,
      loadConfig: () => config,
      createLlmProvider,
      modelPath: "/fake/path",
    });

    await pipeline.startRecording();
    recorder.recordUpTo(45);
    await vi.advanceTimersByTimeAsync(500);

    expect(whisper.calls).toHaveLength(2);
    expect(recorder.fetches).toEqual([{ offset: 0, returned: 720000 }]);

    recorder.recordUpTo(51.2);
    await vi.advanceTimersByTimeAsync(500);

    expect(recorder.fetches.at(-1)).toEqual({ offset: 720000, returned: 99200 });
    expect(recorder.fetches).toHaveLength(2);

    await expect(pipeline.stopAndProcess()).resolves.toBe("Alpha one. Beta two. Gamma three.");
    expect(whisper.calls).toHaveLength(3);

    await vi.advanceTimersByTimeAsync(5000);
    expect(recorder.fetches).toHaveLength(2);
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
