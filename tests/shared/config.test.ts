import { describe, it, expect } from "vitest";
import { createDefaultConfig } from "../../src/shared/config";

describe("VoxConfig", () => {
  it("should create a default config with expected shape", () => {
    const config = createDefaultConfig();

    expect(config.llm.provider).toBe("foundry");
    expect(config.llm.endpoint).toBe("");
    expect(config.llm.apiKey).toBe("");
    expect(config.llm.model).toBe("gpt-4o");
    expect(config.llm.region).toBe("us-east-1");
    expect(config.llm.profile).toBe("");
    expect(config.llm.accessKeyId).toBe("");
    expect(config.llm.secretAccessKey).toBe("");
    expect(config.llm.modelId).toBe("anthropic.claude-3-5-sonnet-20241022-v2:0");
    expect(config.whisper.model).toBe("small");
    expect(config.shortcuts.hold).toBe("Alt+Space");
    expect(config.shortcuts.toggle).toBe("Alt+Shift+Space");
  });
});
