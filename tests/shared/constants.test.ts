import { describe, it, expect } from "vitest";
import { WHISPER_MODELS, APP_NAME, LLM_SYSTEM_PROMPT, buildWhisperPrompt, WHISPER_PROMPT, buildSystemPrompt, WHISPER_LANGUAGES, resolveWhisperLanguage } from "../../src/shared/constants";

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

  it("should include example of literal transcription that looks like a command", () => {
    expect(LLM_SYSTEM_PROMPT).toContain("EXAMPLE");
    expect(LLM_SYSTEM_PROMPT).toMatch(/fala isso em ingl/i);
    expect(LLM_SYSTEM_PROMPT).toContain("NOT talking to you");
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

  it("should prepend language hint before dictionary and base prompt", () => {
    const result = buildWhisperPrompt(["Kubernetes"], "The speaker may use: Portuguese, English.");
    expect(result).toContain("The speaker may use: Portuguese, English.");
    expect(result).toContain("Kubernetes");
    expect(result).toContain(WHISPER_PROMPT);
    expect(result.indexOf("The speaker may use")).toBeLessThan(result.indexOf("Kubernetes"));
  });

  it("should not add prefix when empty", () => {
    const result = buildWhisperPrompt(["Kubernetes"], "");
    expect(result).not.toContain("The speaker may use");
  });
});

describe("buildSystemPrompt", () => {
  it("should return base prompt with empty custom prompt and empty dictionary", () => {
    expect(buildSystemPrompt("", [])).toBe(LLM_SYSTEM_PROMPT);
  });

  it("should append dictionary terms when provided", () => {
    const result = buildSystemPrompt("", ["Kubernetes", "Zustand"]);
    expect(result).toContain("DICTIONARY");
    expect(result).toContain('"Kubernetes"');
    expect(result).toContain('"Zustand"');
  });

  it("should include both dictionary and custom prompt", () => {
    const result = buildSystemPrompt("Be formal", ["Kubernetes"]);
    expect(result).toContain("DICTIONARY");
    expect(result).toContain('"Kubernetes"');
    expect(result).toContain("Be formal");
  });

  it("should place dictionary before custom prompt", () => {
    const result = buildSystemPrompt("Be formal", ["Kubernetes"]);
    const dictIndex = result.indexOf("DICTIONARY");
    const customIndex = result.indexOf("Be formal");
    expect(dictIndex).toBeLessThan(customIndex);
  });

  it("should not include dictionary section when array is empty", () => {
    const result = buildSystemPrompt("Be formal", []);
    expect(result).not.toContain("DICTIONARY");
    expect(result).toContain("Be formal");
  });

  it("should include language context when speechLanguages provided", () => {
    const result = buildSystemPrompt("", [], ["pt", "en"]);
    expect(result).toContain("Português");
    expect(result).toContain("English");
    expect(result).toContain("primarily speaks");
  });

  it("should not include language context when speechLanguages is empty", () => {
    const result = buildSystemPrompt("", [], []);
    expect(result).not.toContain("primarily speaks");
  });

  it("should place language context before dictionary", () => {
    const result = buildSystemPrompt("", ["Kubernetes"], ["pt"]);
    const langIdx = result.indexOf("primarily speaks");
    const dictIdx = result.indexOf("DICTIONARY");
    expect(langIdx).toBeLessThan(dictIdx);
  });
});

describe("WHISPER_LANGUAGES", () => {
  it("should contain at least 20 languages", () => {
    expect(WHISPER_LANGUAGES.length).toBeGreaterThanOrEqual(20);
  });

  it("should have unique codes", () => {
    const codes = WHISPER_LANGUAGES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("should include common languages", () => {
    const codes = WHISPER_LANGUAGES.map((l) => l.code);
    expect(codes).toContain("en");
    expect(codes).toContain("pt");
    expect(codes).toContain("es");
    expect(codes).toContain("fr");
    expect(codes).toContain("de");
    expect(codes).toContain("zh");
    expect(codes).toContain("ja");
    expect(codes).toContain("ko");
  });

  it("should have code and name for each entry", () => {
    for (const lang of WHISPER_LANGUAGES) {
      expect(lang.code).toBeTruthy();
      expect(lang.name).toBeTruthy();
    }
  });
});

describe("resolveWhisperLanguage", () => {
  it("should resolve pt-BR to pt", () => {
    expect(resolveWhisperLanguage("pt-BR")).toBe("pt");
  });

  it("should resolve en-US to en", () => {
    expect(resolveWhisperLanguage("en-US")).toBe("en");
  });

  it("should resolve exact match zh to zh", () => {
    expect(resolveWhisperLanguage("zh")).toBe("zh");
  });

  it("should return null for unsupported locale", () => {
    expect(resolveWhisperLanguage("xx-YY")).toBeNull();
  });
});
