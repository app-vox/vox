import { describe, it, expect } from "vitest";
import { computeLlmConfigHash } from "../../src/shared/llm-config-hash";
import { createDefaultConfig } from "../../src/shared/config";

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
    const config2 = {
      ...createDefaultConfig(),
      llm: { ...createDefaultConfig().llm, provider: "openai" as const },
    };
    expect(computeLlmConfigHash(config1)).not.toBe(
      computeLlmConfigHash(config2),
    );
  });

  it("should return different hash when foundry endpoint changes", () => {
    const config1 = createDefaultConfig();
    const config2 = {
      ...createDefaultConfig(),
      llm: {
        ...createDefaultConfig().llm,
        endpoint: "https://new.endpoint.com",
      },
    };
    expect(computeLlmConfigHash(config1)).not.toBe(
      computeLlmConfigHash(config2),
    );
  });

  it("should include only provider-relevant fields for openai", () => {
    const base = createDefaultConfig();
    base.llm.provider = "openai";
    base.llm.openaiApiKey = "key1";

    const changed = {
      ...createDefaultConfig(),
      llm: { ...base.llm, endpoint: "changed-foundry-endpoint" },
    };
    changed.llm.provider = "openai";
    changed.llm.openaiApiKey = "key1";

    // Changing foundry endpoint should NOT affect hash when provider is openai
    expect(computeLlmConfigHash(base)).toBe(computeLlmConfigHash(changed));
  });

  it("should return different hash when openai API key changes", () => {
    const base = createDefaultConfig();
    base.llm.provider = "openai";
    base.llm.openaiApiKey = "key1";

    const changed = {
      ...createDefaultConfig(),
      llm: { ...base.llm, openaiApiKey: "key2" },
    };
    changed.llm.provider = "openai";

    expect(computeLlmConfigHash(base)).not.toBe(
      computeLlmConfigHash(changed),
    );
  });

  it("should return different hash when bedrock region changes", () => {
    const base = createDefaultConfig();
    base.llm.provider = "bedrock";
    base.llm.region = "us-east-1";

    const changed = {
      ...createDefaultConfig(),
      llm: { ...base.llm, region: "eu-west-1" },
    };
    changed.llm.provider = "bedrock";

    expect(computeLlmConfigHash(base)).not.toBe(
      computeLlmConfigHash(changed),
    );
  });
});
