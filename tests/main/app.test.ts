import { describe, it, expect } from "vitest";
import { createLlmProvider } from "../../src/main/llm/factory";
import { createDefaultConfig } from "../../src/shared/config";

// This test verifies the factory is called correctly from app setup
describe("App setup integration", () => {
  it("should pass full config to createLlmProvider", async () => {
    const config = createDefaultConfig();
    config.enableLlmEnhancement = false;

    const provider = createLlmProvider(config);

    // Verify it returns NoopProvider by checking correct() behavior
    await expect(provider.correct("test")).resolves.toBe("test");
  });
});
