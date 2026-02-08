import { describe, it, expect, vi } from "vitest";

vi.mock("../../../src/main/llm/bedrock", () => ({
  BedrockProvider: vi.fn(),
}));

import { createLlmProvider } from "../../../src/main/llm/factory";
import { FoundryProvider } from "../../../src/main/llm/foundry";
import { BedrockProvider } from "../../../src/main/llm/bedrock";
import { NoopProvider } from "../../../src/main/llm/noop";
import { type VoxConfig, createDefaultConfig } from "../../../src/shared/config";
import { LLM_SYSTEM_PROMPT } from "../../../src/shared/constants";

function makeVoxConfig(overrides: Partial<VoxConfig> = {}): VoxConfig {
  return {
    ...createDefaultConfig(),
    ...overrides,
  };
}

describe("createLlmProvider", () => {
  it("should return NoopProvider when LLM enhancement is disabled", () => {
    const config = makeVoxConfig({
      enableLlmEnhancement: false,
    });
    const provider = createLlmProvider(config);
    expect(provider).toBeInstanceOf(NoopProvider);
  });

  it("should return FoundryProvider when LLM enhancement is enabled with Foundry", () => {
    const config = makeVoxConfig({
      enableLlmEnhancement: true,
      llm: {
        ...createDefaultConfig().llm,
        provider: "foundry",
        endpoint: "https://example.com",
        apiKey: "key",
        model: "claude",
      },
    });
    const provider = createLlmProvider(config);
    expect(provider).toBeInstanceOf(FoundryProvider);
  });

  it("should return BedrockProvider when LLM enhancement is enabled with Bedrock", () => {
    const config = makeVoxConfig({
      enableLlmEnhancement: true,
      llm: {
        ...createDefaultConfig().llm,
        provider: "bedrock",
        region: "us-east-1",
        modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
      },
    });

    createLlmProvider(config);

    expect(BedrockProvider).toHaveBeenCalledWith({
      region: "us-east-1",
      profile: "",
      accessKeyId: "",
      secretAccessKey: "",
      modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
      customPrompt: LLM_SYSTEM_PROMPT,
    });
  });
});
