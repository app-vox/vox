import { describe, it, expect } from "vitest";
import { buildWhisperArgs } from "../../../src/shared/constants";

describe("buildWhisperArgs", () => {
  it("should return 'auto' when no speech languages", () => {
    const result = buildWhisperArgs([]);
    expect(result.language).toBe("auto");
    expect(result.promptPrefix).toBe("");
  });

  it("should return the language code when single language", () => {
    const result = buildWhisperArgs(["pt"]);
    expect(result.language).toBe("pt");
    expect(result.promptPrefix).toBe("");
  });

  it("should return 'auto' with prompt prefix when multiple languages", () => {
    const result = buildWhisperArgs(["pt", "en"]);
    expect(result.language).toBe("auto");
    expect(result.promptPrefix).toContain("Português");
    expect(result.promptPrefix).toContain("English");
  });
});
