import { describe, it, expect } from "vitest";
import { WHISPER_MODELS, APP_NAME, LLM_SYSTEM_PROMPT, buildWhisperPrompt, WHISPER_PROMPT } from "../../src/shared/constants";

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
    expect(LLM_SYSTEM_PROMPT.toLowerCase()).toContain("filler words");
  });
});

describe("buildWhisperPrompt", () => {
  it("should return base prompt when dictionary is empty", () => {
    expect(buildWhisperPrompt([])).toBe(WHISPER_PROMPT);
  });

  it("should prepend dictionary terms before base prompt", () => {
    const result = buildWhisperPrompt(["Kubernetes", "Zustand"]);
    expect(result).toBe(`Kubernetes, Zustand. ${WHISPER_PROMPT}`);
  });

  it("should truncate terms to fit within character limit", () => {
    const longTerms = Array.from({ length: 200 }, (_, i) => `LongTechnicalTerm${i}`);
    const result = buildWhisperPrompt(longTerms);
    expect(result.length).toBeLessThanOrEqual(896);
    expect(result).toContain(WHISPER_PROMPT);
  });

  it("should truncate at last comma to avoid partial words", () => {
    const longTerms = Array.from({ length: 200 }, (_, i) => `Term${i}`);
    const result = buildWhisperPrompt(longTerms);
    const termsSection = result.slice(0, result.indexOf(`. ${WHISPER_PROMPT}`));
    expect(termsSection).not.toMatch(/,\s*$/);
    expect(termsSection).toMatch(/\w$/);
  });
});
