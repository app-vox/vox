import { describe, it, expect } from "vitest";
import { WHISPER_MODELS, APP_NAME, LLM_SYSTEM_PROMPT } from "../../src/shared/constants";

describe("constants", () => {
  it("should define all whisper model sizes with URLs and sizes", () => {
    expect(WHISPER_MODELS).toHaveProperty("tiny");
    expect(WHISPER_MODELS).toHaveProperty("base");
    expect(WHISPER_MODELS).toHaveProperty("small");
    expect(WHISPER_MODELS).toHaveProperty("medium");
    expect(WHISPER_MODELS).toHaveProperty("large");

    for (const model of Object.values(WHISPER_MODELS)) {
      expect(model).toHaveProperty("url");
      expect(model).toHaveProperty("sizeBytes");
      expect(model.url).toMatch(/^https:\/\//);
      expect(model.sizeBytes).toBeGreaterThan(0);
    }
  });

  it("should define app name", () => {
    expect(APP_NAME).toBe("vox");
  });

  it("should define LLM system prompt", () => {
    expect(LLM_SYSTEM_PROMPT).toContain("speech-to-text post-processor");
    expect(LLM_SYSTEM_PROMPT).toContain("filler words");
  });
});
