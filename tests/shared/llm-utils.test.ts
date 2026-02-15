import { describe, it, expect } from "vitest";
import { isProviderConfigured } from "../../src/shared/llm-utils";
import { createDefaultConfig } from "../../src/shared/config";
import type { LlmConfig } from "../../src/shared/config";
import { migrateActiveTab } from "../../src/renderer/stores/config-store";

function llmWith(overrides: Partial<LlmConfig>): LlmConfig {
  return { ...createDefaultConfig().llm, ...overrides };
}

describe("isProviderConfigured", () => {
  describe("foundry", () => {
    it("returns true when endpoint, apiKey, and model are set", () => {
      expect(isProviderConfigured("foundry", llmWith({
        provider: "foundry", endpoint: "https://x", apiKey: "key", model: "gpt-4o",
      }))).toBe(true);
    });

    it("returns false when apiKey is missing", () => {
      expect(isProviderConfigured("foundry", llmWith({
        provider: "foundry", endpoint: "https://x", apiKey: "", model: "gpt-4o",
      }))).toBe(false);
    });
  });

  describe("bedrock", () => {
    it("returns true with profile auth", () => {
      expect(isProviderConfigured("bedrock", llmWith({
        provider: "bedrock", region: "us-east-1", modelId: "m", profile: "default",
      }))).toBe(true);
    });

    it("returns true with access key auth", () => {
      expect(isProviderConfigured("bedrock", llmWith({
        provider: "bedrock", region: "us-east-1", modelId: "m", profile: "", accessKeyId: "ak", secretAccessKey: "sk",
      }))).toBe(true);
    });

    it("returns false when neither auth method is provided", () => {
      expect(isProviderConfigured("bedrock", llmWith({
        provider: "bedrock", region: "us-east-1", modelId: "m", profile: "", accessKeyId: "", secretAccessKey: "",
      }))).toBe(false);
    });
  });

  describe("openai-compatible (openai, deepseek, glm)", () => {
    for (const provider of ["openai", "deepseek", "glm"] as const) {
      it(`${provider}: returns true when all fields set`, () => {
        expect(isProviderConfigured(provider, llmWith({
          provider, openaiApiKey: "key", openaiModel: "gpt-4o", openaiEndpoint: "https://api.openai.com",
        }))).toBe(true);
      });

      it(`${provider}: returns false when apiKey missing`, () => {
        expect(isProviderConfigured(provider, llmWith({
          provider, openaiApiKey: "", openaiModel: "gpt-4o", openaiEndpoint: "https://api.openai.com",
        }))).toBe(false);
      });
    }
  });

  describe("litellm", () => {
    it("returns true when endpoint and model are set (no apiKey required)", () => {
      expect(isProviderConfigured("litellm", llmWith({
        provider: "litellm", openaiEndpoint: "http://localhost:4000", openaiModel: "gpt-4o",
      }))).toBe(true);
    });

    it("returns false when endpoint is missing", () => {
      expect(isProviderConfigured("litellm", llmWith({
        provider: "litellm", openaiEndpoint: "", openaiModel: "gpt-4o",
      }))).toBe(false);
    });
  });

  describe("anthropic", () => {
    it("returns true when apiKey and model are set", () => {
      expect(isProviderConfigured("anthropic", llmWith({
        provider: "anthropic", anthropicApiKey: "key", anthropicModel: "claude-sonnet-4-20250514",
      }))).toBe(true);
    });

    it("returns false when model is missing", () => {
      expect(isProviderConfigured("anthropic", llmWith({
        provider: "anthropic", anthropicApiKey: "key", anthropicModel: "",
      }))).toBe(false);
    });
  });

  describe("custom", () => {
    it("returns true when endpoint, token, and tokenAttr are set", () => {
      expect(isProviderConfigured("custom", llmWith({
        provider: "custom", customEndpoint: "https://x", customToken: "tok", customTokenAttr: "Authorization",
      }))).toBe(true);
    });

    it("returns false when token is missing", () => {
      expect(isProviderConfigured("custom", llmWith({
        provider: "custom", customEndpoint: "https://x", customToken: "", customTokenAttr: "Authorization",
      }))).toBe(false);
    });
  });

  it("returns false for unknown provider", () => {
    expect(isProviderConfigured("nonexistent" as never, llmWith({ provider: "foundry" }))).toBe(false);
  });
});

describe("migrateActiveTab", () => {
  it.each([
    ["appearance", "general"],
    ["history", "transcriptions"],
    ["general", "general"],
    ["whisper", "whisper"],
    [null, null],
  ] as const)("maps %j to %j", (input, expected) => {
    expect(migrateActiveTab(input)).toBe(expected);
  });
});
