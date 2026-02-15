import { describe, it, expect } from "vitest";
import { createDefaultConfig, createDefaultLlmFlat, narrowLlmConfig } from "../../src/shared/config";

describe("VoxConfig", () => {
  it("should create a default config with foundry provider shape", () => {
    const config = createDefaultConfig();
    expect(config.llm.provider).toBe("foundry");
    expect(config.llm.endpoint).toBe("");
    expect(config.llm.apiKey).toBe("");
    expect(config.llm.model).toBe("gpt-4o");
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

  it("should include analyticsEnabled defaulting to true", () => {
    const config = createDefaultConfig();
    expect(config.analyticsEnabled).toBe(true);
  });
});

describe("createDefaultLlmFlat", () => {
  it("should contain all provider fields with correct defaults", () => {
    const flat = createDefaultLlmFlat();
    expect(flat.provider).toBe("foundry");
    expect(flat.region).toBe("us-east-1");
    expect(flat.modelId).toBe("anthropic.claude-3-5-sonnet-20241022-v2:0");
    expect(flat.openaiModel).toBe("gpt-4o");
    expect(flat.openaiEndpoint).toBe("https://api.openai.com");
    expect(flat.anthropicModel).toBe("claude-sonnet-4-20250514");
    expect(flat.customTokenSendAs).toBe("header");
  });
});

describe("narrowLlmConfig", () => {
  it("should narrow foundry provider", () => {
    const flat = createDefaultLlmFlat();
    const narrowed = narrowLlmConfig(flat);
    expect(narrowed).toEqual({
      provider: "foundry",
      endpoint: "",
      apiKey: "",
      model: "gpt-4o",
    });
  });

  it("should narrow bedrock provider", () => {
    const flat = { ...createDefaultLlmFlat(), provider: "bedrock" as const };
    const narrowed = narrowLlmConfig(flat);
    expect(narrowed).toEqual({
      provider: "bedrock",
      region: "us-east-1",
      profile: "",
      accessKeyId: "",
      secretAccessKey: "",
      modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
    });
  });

  it("should narrow openai provider", () => {
    const flat = { ...createDefaultLlmFlat(), provider: "openai" as const };
    const narrowed = narrowLlmConfig(flat);
    expect(narrowed).toEqual({
      provider: "openai",
      openaiApiKey: "",
      openaiModel: "gpt-4o",
      openaiEndpoint: "https://api.openai.com",
    });
  });

  it("should narrow anthropic provider", () => {
    const flat = { ...createDefaultLlmFlat(), provider: "anthropic" as const };
    const narrowed = narrowLlmConfig(flat);
    expect(narrowed).toEqual({
      provider: "anthropic",
      anthropicApiKey: "",
      anthropicModel: "claude-sonnet-4-20250514",
    });
  });

  it("should narrow custom provider", () => {
    const flat = { ...createDefaultLlmFlat(), provider: "custom" as const };
    const narrowed = narrowLlmConfig(flat);
    expect(narrowed).toEqual({
      provider: "custom",
      customEndpoint: "",
      customToken: "",
      customTokenAttr: "Authorization",
      customTokenSendAs: "header",
      customModel: "",
    });
  });

  it("should narrow litellm as OpenAI-compatible variant", () => {
    const flat = { ...createDefaultLlmFlat(), provider: "litellm" as const };
    const narrowed = narrowLlmConfig(flat);
    expect(narrowed).toEqual({
      provider: "litellm",
      openaiApiKey: "",
      openaiModel: "gpt-4o",
      openaiEndpoint: "https://api.openai.com",
    });
  });
});
