import { describe, it, expect } from "vitest";
import { NoopProvider } from "../../../src/main/llm/noop";

describe("NoopProvider", () => {
  it("should return raw text unchanged", async () => {
    const provider = new NoopProvider();
    const rawText = "This is raw transcription text";
    const result = await provider.correct(rawText);
    expect(result).toBe(rawText);
  });

  it("should handle empty text", async () => {
    const provider = new NoopProvider();
    const result = await provider.correct("");
    expect(result).toBe("");
  });

  it("should handle multiline text", async () => {
    const provider = new NoopProvider();
    const rawText = "Line one\nLine two\nLine three";
    const result = await provider.correct(rawText);
    expect(result).toBe(rawText);
  });
});
