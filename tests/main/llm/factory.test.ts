import { describe, it, expect, vi } from "vitest";

vi.mock("electron-log/main", () => ({
  default: {
    scope: vi.fn().mockReturnValue({
      info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(),
    }),
  },
}));

vi.mock("../../../src/main/llm/bedrock", () => ({
  BedrockProvider: vi.fn(),
}));

import { createLlmProvider } from "../../../src/main/llm/factory";
import { FoundryProvider } from "../../../src/main/llm/foundry";
import { BedrockProvider } from "../../../src/main/llm/bedrock";
import { NoopProvider } from "../../../src/main/llm/noop";
import { type VoxConfig, type LlmConfig, createDefaultConfig } from "../../../src/shared/config";
import { LLM_SYSTEM_PROMPT } from "../../../src/shared/constants";
import { computeLlmConfigHash } from "../../../src/shared/llm-config-hash";

function makeVoxConfig(overrides: Partial<VoxConfig> & { llm?: LlmConfig } = {}): VoxConfig {
  return {
    ...createDefaultConfig(),
    ...overrides,
  };
}

describe("createLlmProvider", () => {
  it("should return NoopProvider when LLM enhancement is disabled", () => {
    const config = makeVoxConfig({ enableLlmEnhancement: false });
    const provider = createLlmProvider(config);
    expect(provider).toBeInstanceOf(NoopProvider);
  });

  it("should return FoundryProvider when LLM enhancement is enabled with Foundry", () => {
    const config = makeVoxConfig({
      enableLlmEnhancement: true,
      llmConnectionTested: true,
      llm: { provider: "foundry", endpoint: "https://example.com", apiKey: "key", model: "claude" },
    });
    config.llmConfigHash = computeLlmConfigHash(config);
    const provider = createLlmProvider(config);
    expect(provider).toBeInstanceOf(FoundryProvider);
  });

  it("should return BedrockProvider when LLM enhancement is enabled with Bedrock", () => {
    const config = makeVoxConfig({
      enableLlmEnhancement: true,
      llmConnectionTested: true,
      llm: {
        provider: "bedrock", region: "us-east-1", profile: "",
        accessKeyId: "", secretAccessKey: "", modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
      },
    });
    config.llmConfigHash = computeLlmConfigHash(config);

    createLlmProvider(config);

    expect(BedrockProvider).toHaveBeenCalledWith({
      region: "us-east-1", profile: "", accessKeyId: "", secretAccessKey: "",
      modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
      customPrompt: LLM_SYSTEM_PROMPT, hasCustomPrompt: false,
    });
  });

  it("should return NoopProvider when LLM is enabled but not tested", () => {
    const config = makeVoxConfig({
      enableLlmEnhancement: true, llmConnectionTested: false, llmConfigHash: "",
      llm: { provider: "foundry", endpoint: "https://example.com", apiKey: "key", model: "claude" },
    });
    expect(createLlmProvider(config)).toBeInstanceOf(NoopProvider);
  });

  it("should return NoopProvider when config hash does not match", () => {
    const config = makeVoxConfig({
      enableLlmEnhancement: true, llmConnectionTested: true, llmConfigHash: "stale-hash",
      llm: { provider: "foundry", endpoint: "https://example.com", apiKey: "key", model: "claude" },
    });
    expect(createLlmProvider(config)).toBeInstanceOf(NoopProvider);
  });

  it("should return real provider when tested and hash matches", () => {
    const config = makeVoxConfig({
      enableLlmEnhancement: true, llmConnectionTested: true,
      llm: { provider: "foundry", endpoint: "https://example.com", apiKey: "key", model: "claude" },
    });
    config.llmConfigHash = computeLlmConfigHash(config);
    expect(createLlmProvider(config)).toBeInstanceOf(FoundryProvider);
  });

  it("should return real provider when forTest option is true even if not tested", () => {
    const config = makeVoxConfig({
      enableLlmEnhancement: true, llmConnectionTested: false, llmConfigHash: "",
      llm: { provider: "foundry", endpoint: "https://example.com", apiKey: "key", model: "claude" },
    });
    expect(createLlmProvider(config, { forTest: true })).toBeInstanceOf(FoundryProvider);
  });

  it("should bypass enableLlmEnhancement check when forTest is true", () => {
    const config = makeVoxConfig({
      enableLlmEnhancement: false, llmConnectionTested: false, llmConfigHash: "",
      llm: { provider: "foundry", endpoint: "https://example.com", apiKey: "key", model: "claude" },
    });
    expect(createLlmProvider(config, { forTest: true })).toBeInstanceOf(FoundryProvider);
  });
});
