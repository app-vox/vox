import { describe, it, expect } from "vitest";
import { isProviderConfigured, getLlmModelName } from "../../src/shared/llm-utils";
import type { LlmConfig } from "../../src/shared/config";
import { migrateActiveTab } from "../../src/renderer/stores/config-store";

describe("isProviderConfigured", () => {
  describe("foundry", () => {
    it("returns true when endpoint, apiKey, and model are set", () => {
      expect(isProviderConfigured("foundry", {
        provider: "foundry", endpoint: "https://x", apiKey: "key", model: "gpt-4o",
      })).toBe(true);
    });

    it("returns false when apiKey is missing", () => {
      expect(isProviderConfigured("foundry", {
        provider: "foundry", endpoint: "https://x", apiKey: "", model: "gpt-4o",
      })).toBe(false);
    });
  });

  describe("bedrock", () => {
    it("returns true with profile auth", () => {
      expect(isProviderConfigured("bedrock", {
        provider: "bedrock", region: "us-east-1", modelId: "m", profile: "default",
        accessKeyId: "", secretAccessKey: "",
      })).toBe(true);
    });

    it("returns true with access key auth", () => {
      expect(isProviderConfigured("bedrock", {
        provider: "bedrock", region: "us-east-1", modelId: "m", profile: "",
        accessKeyId: "ak", secretAccessKey: "sk",
      })).toBe(true);
    });

    it("returns false when neither auth method is provided", () => {
      expect(isProviderConfigured("bedrock", {
        provider: "bedrock", region: "us-east-1", modelId: "m", profile: "",
        accessKeyId: "", secretAccessKey: "",
      })).toBe(false);
    });
  });

  describe("openai-compatible (openai, deepseek, glm)", () => {
    for (const provider of ["openai", "deepseek", "glm"] as const) {
      it(`${provider}: returns true when all fields set`, () => {
        expect(isProviderConfigured(provider, {
          provider, openaiApiKey: "key", openaiModel: "gpt-4o", openaiEndpoint: "https://api.openai.com",
        })).toBe(true);
      });

      it(`${provider}: returns false when apiKey missing`, () => {
        expect(isProviderConfigured(provider, {
          provider, openaiApiKey: "", openaiModel: "gpt-4o", openaiEndpoint: "https://api.openai.com",
        })).toBe(false);
      });
    }
  });

  describe("litellm", () => {
    it("returns true when endpoint and model are set (no apiKey required)", () => {
      expect(isProviderConfigured("litellm", {
        provider: "litellm", openaiEndpoint: "http://localhost:4000", openaiModel: "gpt-4o", openaiApiKey: "",
      })).toBe(true);
    });

    it("returns false when endpoint is missing", () => {
      expect(isProviderConfigured("litellm", {
        provider: "litellm", openaiEndpoint: "", openaiModel: "gpt-4o", openaiApiKey: "",
      })).toBe(false);
    });
  });

  describe("anthropic", () => {
    it("returns true when apiKey and model are set", () => {
      expect(isProviderConfigured("anthropic", {
        provider: "anthropic", anthropicApiKey: "key", anthropicModel: "claude-sonnet-4-20250514",
      })).toBe(true);
    });

    it("returns false when model is missing", () => {
      expect(isProviderConfigured("anthropic", {
        provider: "anthropic", anthropicApiKey: "key", anthropicModel: "",
      })).toBe(false);
    });
  });

  describe("custom", () => {
    it("returns true when endpoint, token, and tokenAttr are set", () => {
      expect(isProviderConfigured("custom", {
        provider: "custom", customEndpoint: "https://x", customToken: "tok",
        customTokenAttr: "Authorization", customTokenSendAs: "header", customModel: "",
      })).toBe(true);
    });

    it("returns false when token is missing", () => {
      expect(isProviderConfigured("custom", {
        provider: "custom", customEndpoint: "https://x", customToken: "",
        customTokenAttr: "Authorization", customTokenSendAs: "header", customModel: "",
      })).toBe(false);
    });
  });

  it("returns false when provider param does not match config provider", () => {
    expect(isProviderConfigured("bedrock", {
      provider: "foundry", endpoint: "https://x", apiKey: "key", model: "gpt-4o",
    })).toBe(false);
  });
});

describe("getLlmModelName", () => {
  it("should return model for foundry", () => {
    const llm: LlmConfig = { provider: "foundry", endpoint: "", apiKey: "", model: "gpt-4o" };
    expect(getLlmModelName(llm)).toBe("gpt-4o");
  });

  it("should return modelId for bedrock", () => {
    const llm: LlmConfig = {
      provider: "bedrock", region: "us-east-1", profile: "", accessKeyId: "",
      secretAccessKey: "", modelId: "anthropic.claude-3-5-sonnet",
    };
    expect(getLlmModelName(llm)).toBe("anthropic.claude-3-5-sonnet");
  });

  it("should return openaiModel for openai", () => {
    const llm: LlmConfig = {
      provider: "openai", openaiApiKey: "", openaiModel: "gpt-4-turbo", openaiEndpoint: "",
    };
    expect(getLlmModelName(llm)).toBe("gpt-4-turbo");
  });

  it("should return openaiModel for deepseek", () => {
    const llm: LlmConfig = {
      provider: "deepseek", openaiApiKey: "", openaiModel: "deepseek-chat", openaiEndpoint: "",
    };
    expect(getLlmModelName(llm)).toBe("deepseek-chat");
  });

  it("should return openaiModel for glm", () => {
    const llm: LlmConfig = {
      provider: "glm", openaiApiKey: "", openaiModel: "glm-4", openaiEndpoint: "",
    };
    expect(getLlmModelName(llm)).toBe("glm-4");
  });

  it("should return openaiModel for litellm", () => {
    const llm: LlmConfig = {
      provider: "litellm", openaiApiKey: "", openaiModel: "gpt-4o", openaiEndpoint: "",
    };
    expect(getLlmModelName(llm)).toBe("gpt-4o");
  });

  it("should return anthropicModel for anthropic", () => {
    const llm: LlmConfig = {
      provider: "anthropic", anthropicApiKey: "", anthropicModel: "claude-sonnet-4-20250514",
    };
    expect(getLlmModelName(llm)).toBe("claude-sonnet-4-20250514");
  });

  it("should return customModel for custom", () => {
    const llm: LlmConfig = {
      provider: "custom", customEndpoint: "", customToken: "",
      customTokenAttr: "", customTokenSendAs: "header", customModel: "my-model",
    };
    expect(getLlmModelName(llm)).toBe("my-model");
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
