import { describe, it, expect } from "vitest";
import { computeLlmConfigHash, isEnhancementReady } from "../../src/shared/llm-config-hash";
import { createDefaultConfig } from "../../src/shared/config";
import type { VoxConfig, LlmConfig } from "../../src/shared/config";

function makeConfig(llm: LlmConfig): VoxConfig {
  return { ...createDefaultConfig(), llm };
}

describe("computeLlmConfigHash", () => {
  it("should return a non-empty string for default config", () => {
    const config = createDefaultConfig();
    const hash = computeLlmConfigHash(config);
    expect(hash).toBeTruthy();
    expect(typeof hash).toBe("string");
  });

  it("should return same hash for identical configs", () => {
    const config1 = createDefaultConfig();
    const config2 = createDefaultConfig();
    expect(computeLlmConfigHash(config1)).toBe(computeLlmConfigHash(config2));
  });

  it("should return different hash when provider changes", () => {
    const config1 = createDefaultConfig();
    const config2 = makeConfig({
      provider: "openai", openaiApiKey: "", openaiModel: "gpt-4o", openaiEndpoint: "https://api.openai.com",
    });
    expect(computeLlmConfigHash(config1)).not.toBe(computeLlmConfigHash(config2));
  });

  it("should return different hash when foundry endpoint changes", () => {
    const config1 = createDefaultConfig();
    const config2 = makeConfig({
      provider: "foundry", endpoint: "https://new.endpoint.com", apiKey: "", model: "gpt-4o",
    });
    expect(computeLlmConfigHash(config1)).not.toBe(computeLlmConfigHash(config2));
  });

  it("should include only provider-relevant fields for openai", () => {
    const base = makeConfig({
      provider: "openai", openaiApiKey: "key1", openaiModel: "gpt-4o", openaiEndpoint: "https://api.openai.com",
    });
    const same = makeConfig({
      provider: "openai", openaiApiKey: "key1", openaiModel: "gpt-4o", openaiEndpoint: "https://api.openai.com",
    });
    expect(computeLlmConfigHash(base)).toBe(computeLlmConfigHash(same));
  });

  it("should return different hash when openai API key changes", () => {
    const base = makeConfig({
      provider: "openai", openaiApiKey: "key1", openaiModel: "gpt-4o", openaiEndpoint: "https://api.openai.com",
    });
    const changed = makeConfig({
      provider: "openai", openaiApiKey: "key2", openaiModel: "gpt-4o", openaiEndpoint: "https://api.openai.com",
    });
    expect(computeLlmConfigHash(base)).not.toBe(computeLlmConfigHash(changed));
  });

  it("should return different hash when bedrock region changes", () => {
    const base = makeConfig({
      provider: "bedrock", region: "us-east-1", profile: "", accessKeyId: "",
      secretAccessKey: "", modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
    });
    const changed = makeConfig({
      provider: "bedrock", region: "eu-west-1", profile: "", accessKeyId: "",
      secretAccessKey: "", modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
    });
    expect(computeLlmConfigHash(base)).not.toBe(computeLlmConfigHash(changed));
  });
});

describe("isEnhancementReady", () => {
  function testedConfig(): VoxConfig {
    const config = { ...createDefaultConfig(), enableLlmEnhancement: true, llmConnectionTested: true };
    return { ...config, llmConfigHash: computeLlmConfigHash(config) };
  }

  it("is true when enhancement is on, tested and the provider settings are unchanged", () => {
    expect(isEnhancementReady(testedConfig())).toBe(true);
  });

  it("is false when enhancement is off", () => {
    expect(isEnhancementReady({ ...testedConfig(), enableLlmEnhancement: false })).toBe(false);
  });

  it("is false when the connection is untested", () => {
    expect(isEnhancementReady({ ...testedConfig(), llmConnectionTested: false })).toBe(false);
  });

  it("is false when the provider settings changed since the test", () => {
    const changed = { ...testedConfig(), llm: { provider: "foundry" as const, endpoint: "https://other.example.com", apiKey: "", model: "gpt-4o" } };
    expect(isEnhancementReady(changed)).toBe(false);
  });

  it("ignores prompt edits and switches", () => {
    const prompts = [{ id: "a", name: "A", icon: "📝", instructions: "Be brief." }];
    expect(isEnhancementReady({ ...testedConfig(), prompts, activePromptId: "a" })).toBe(true);
  });
});
