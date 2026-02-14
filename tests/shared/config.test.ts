import { describe, it, expect } from "vitest";
import { createDefaultConfig } from "../../src/shared/config";

describe("VoxConfig", () => {
  it("should create a default config with expected shape", () => {
    const config = createDefaultConfig();

    expect(config.llm.provider).toBe("foundry");
    expect(config.llm.endpoint).toBe("");
    expect(config.llm.apiKey).toBe("");
    expect(config.llm.model).toBe("gpt-4o");
    expect(config.llm.region).toBe("us-east-1");
    expect(config.llm.profile).toBe("");
    expect(config.llm.accessKeyId).toBe("");
    expect(config.llm.secretAccessKey).toBe("");
    expect(config.llm.modelId).toBe("anthropic.claude-3-5-sonnet-20241022-v2:0");
    expect(config.whisper.model).toBe("small");
    expect(config.shortcuts.hold).toBe("Alt+Space");
    expect(config.shortcuts.toggle).toBe("Alt+Shift+Space");
  });

  it("should include an empty dictionary array in the default config", () => {
    const config = createDefaultConfig();
    expect(config.dictionary).toEqual([]);
  });

  it("should include language field defaulting to 'system'", () => {
    const config = createDefaultConfig();
    expect(config.language).toBe("system");
  });

  it("should include recordingAudioCue defaulting to 'tap'", () => {
    const config = createDefaultConfig();
    expect(config.recordingAudioCue).toBe("tap");
  });

  it("should include recordingStopAudioCue defaulting to 'pop'", () => {
    const config = createDefaultConfig();
    expect(config.recordingStopAudioCue).toBe("pop");
  });

  it("should include errorAudioCue defaulting to 'error'", () => {
    const config = createDefaultConfig();
    expect(config.errorAudioCue).toBe("error");
  });

  it("should include llmConnectionTested defaulting to false", () => {
    const config = createDefaultConfig();
    expect(config.llmConnectionTested).toBe(false);
  });

  it("should include llmConfigHash defaulting to empty string", () => {
    const config = createDefaultConfig();
    expect(config.llmConfigHash).toBe("");
  });
});
