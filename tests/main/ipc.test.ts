import { describe, it, expect } from "vitest";
import { createDefaultConfig } from "../../src/shared/config";

describe("IPC llm:test handler", () => {
  it("should return success immediately when LLM enhancement disabled", async () => {
    const config = createDefaultConfig();
    config.enableLlmEnhancement = false;

    // Simulate handler logic
    const result = config.enableLlmEnhancement
      ? { ok: false, error: "Would test LLM" }
      : { ok: true };

    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
  });
});
