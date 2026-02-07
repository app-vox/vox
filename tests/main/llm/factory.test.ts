import { describe, it, expect, vi } from "vitest";

vi.mock("../../../src/main/llm/bedrock", () => ({
  BedrockProvider: vi.fn(),
}));

import { createLlmProvider } from "../../../src/main/llm/factory";
import { FoundryProvider } from "../../../src/main/llm/foundry";
import { BedrockProvider } from "../../../src/main/llm/bedrock";
import { type LlmConfig } from "../../../src/shared/config";

function makeConfig(overrides: Partial<LlmConfig> = {}): LlmConfig {
  return {
    provider: "foundry",
    endpoint: "",
    apiKey: "",
    model: "",
    region: "",
    profile: "",
    accessKeyId: "",
    secretAccessKey: "",
    modelId: "",
    ...overrides,
  };
}

describe("createLlmProvider", () => {
  it("should return a FoundryProvider when provider is foundry", () => {
    const provider = createLlmProvider(makeConfig({
      provider: "foundry",
      endpoint: "https://example.com",
      apiKey: "key",
      model: "claude",
    }));

    expect(provider).toBeInstanceOf(FoundryProvider);
  });

  it("should return a BedrockProvider when provider is bedrock", () => {
    createLlmProvider(makeConfig({
      provider: "bedrock",
      region: "us-east-1",
      modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
    }));

    expect(BedrockProvider).toHaveBeenCalledWith({
      region: "us-east-1",
      profile: "",
      accessKeyId: "",
      secretAccessKey: "",
      modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
    });
  });

  it("should default to FoundryProvider for unknown provider", () => {
    const provider = createLlmProvider(makeConfig({
      provider: "unknown" as any,
      endpoint: "https://example.com",
      apiKey: "key",
      model: "claude",
    }));

    expect(provider).toBeInstanceOf(FoundryProvider);
  });
});
