import { describe, it, expect } from "vitest";
import { getLlmModelName } from "../../src/shared/llm-utils";
import type { LlmConfig } from "../../src/shared/config";

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
