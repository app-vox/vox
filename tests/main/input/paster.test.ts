import { describe, it, expect } from "vitest";
import { buildPasteSequence } from "../../../src/main/input/paster";

describe("buildPasteSequence", () => {
  it("should return the text to be placed on clipboard", () => {
    const result = buildPasteSequence("Hello, world!");
    expect(result.clipboardText).toBe("Hello, world!");
  });

  it("should handle empty text", () => {
    const result = buildPasteSequence("");
    expect(result.clipboardText).toBe("");
    expect(result.shouldPaste).toBe(false);
  });

  it("should flag shouldPaste as true for non-empty text", () => {
    const result = buildPasteSequence("Some text");
    expect(result.shouldPaste).toBe(true);
  });
});
