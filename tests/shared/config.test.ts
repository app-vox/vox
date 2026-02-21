import { describe, it, expect } from "vitest";
import { createDefaultConfig, createDefaultLlmFlat, narrowLlmConfig, spreadLlmToFlat } from "../../src/shared/config";

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

  it("should include speechLanguages defaulting to empty array", () => {
    const config = createDefaultConfig();
    expect(config.speechLanguages).toEqual([]);
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
    expect(flat.deepseekModel).toBe("deepseek-chat");
    expect(flat.deepseekEndpoint).toBe("https://api.deepseek.com");
    expect(flat.glmModel).toBe("glm-4");
    expect(flat.glmEndpoint).toBe("https://open.bigmodel.cn/api/paas/v4");
    expect(flat.litellmModel).toBe("gpt-4o");
    expect(flat.litellmEndpoint).toBe("http://localhost:4000");
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

  it("should narrow deepseek using per-provider fields", () => {
    const flat = {
      ...createDefaultLlmFlat(),
      provider: "deepseek" as const,
      deepseekApiKey: "sk-ds",
      deepseekModel: "deepseek-chat",
      deepseekEndpoint: "https://api.deepseek.com",
    };
    const narrowed = narrowLlmConfig(flat);
    expect(narrowed).toEqual({
      provider: "deepseek",
      openaiApiKey: "sk-ds",
      openaiModel: "deepseek-chat",
      openaiEndpoint: "https://api.deepseek.com",
    });
  });

  it("should narrow glm using per-provider fields", () => {
    const flat = {
      ...createDefaultLlmFlat(),
      provider: "glm" as const,
      glmApiKey: "glm-key",
      glmModel: "glm-4",
      glmEndpoint: "https://open.bigmodel.cn/api/paas/v4",
    };
    const narrowed = narrowLlmConfig(flat);
    expect(narrowed).toEqual({
      provider: "glm",
      openaiApiKey: "glm-key",
      openaiModel: "glm-4",
      openaiEndpoint: "https://open.bigmodel.cn/api/paas/v4",
    });
  });

  it("should narrow litellm using per-provider fields", () => {
    const flat = {
      ...createDefaultLlmFlat(),
      provider: "litellm" as const,
      litellmApiKey: "lt-key",
      litellmModel: "gpt-4o",
      litellmEndpoint: "http://localhost:4000",
    };
    const narrowed = narrowLlmConfig(flat);
    expect(narrowed).toEqual({
      provider: "litellm",
      openaiApiKey: "lt-key",
      openaiModel: "gpt-4o",
      openaiEndpoint: "http://localhost:4000",
    });
  });

  it("should keep openai and deepseek values independent", () => {
    const flat = {
      ...createDefaultLlmFlat(),
      provider: "openai" as const,
      openaiApiKey: "sk-openai",
      openaiModel: "gpt-4o",
      openaiEndpoint: "https://api.openai.com",
      deepseekApiKey: "sk-deepseek",
      deepseekModel: "deepseek-chat",
      deepseekEndpoint: "https://api.deepseek.com",
    };
    const openaiNarrowed = narrowLlmConfig(flat);
    expect(openaiNarrowed).toEqual({
      provider: "openai",
      openaiApiKey: "sk-openai",
      openaiModel: "gpt-4o",
      openaiEndpoint: "https://api.openai.com",
    });

    const deepseekNarrowed = narrowLlmConfig({ ...flat, provider: "deepseek" });
    expect(deepseekNarrowed).toEqual({
      provider: "deepseek",
      openaiApiKey: "sk-deepseek",
      openaiModel: "deepseek-chat",
      openaiEndpoint: "https://api.deepseek.com",
    });
  });
});

describe("spreadLlmToFlat", () => {
  it("should map openai provider to shared openai fields", () => {
    const result = spreadLlmToFlat({
      provider: "openai",
      openaiApiKey: "sk-openai",
      openaiModel: "gpt-4o",
      openaiEndpoint: "https://api.openai.com",
    });
    expect(result).toEqual({
      provider: "openai",
      openaiApiKey: "sk-openai",
      openaiModel: "gpt-4o",
      openaiEndpoint: "https://api.openai.com",
    });
  });

  it("should map deepseek provider to deepseek-specific fields", () => {
    const result = spreadLlmToFlat({
      provider: "deepseek",
      openaiApiKey: "sk-ds",
      openaiModel: "deepseek-chat",
      openaiEndpoint: "https://api.deepseek.com",
    });
    expect(result).toEqual({
      provider: "deepseek",
      deepseekApiKey: "sk-ds",
      deepseekModel: "deepseek-chat",
      deepseekEndpoint: "https://api.deepseek.com",
    });
  });

  it("should map glm provider to glm-specific fields", () => {
    const result = spreadLlmToFlat({
      provider: "glm",
      openaiApiKey: "glm-key",
      openaiModel: "glm-4",
      openaiEndpoint: "https://open.bigmodel.cn/api/paas/v4",
    });
    expect(result).toEqual({
      provider: "glm",
      glmApiKey: "glm-key",
      glmModel: "glm-4",
      glmEndpoint: "https://open.bigmodel.cn/api/paas/v4",
    });
  });

  it("should map litellm provider to litellm-specific fields", () => {
    const result = spreadLlmToFlat({
      provider: "litellm",
      openaiApiKey: "lt-key",
      openaiModel: "gpt-4o",
      openaiEndpoint: "http://localhost:4000",
    });
    expect(result).toEqual({
      provider: "litellm",
      litellmApiKey: "lt-key",
      litellmModel: "gpt-4o",
      litellmEndpoint: "http://localhost:4000",
    });
  });

  it("should pass through foundry fields unchanged", () => {
    const result = spreadLlmToFlat({
      provider: "foundry",
      endpoint: "https://foundry.example.com",
      apiKey: "f-key",
      model: "gpt-4o",
    });
    expect(result).toEqual({
      provider: "foundry",
      endpoint: "https://foundry.example.com",
      apiKey: "f-key",
      model: "gpt-4o",
    });
  });
});
