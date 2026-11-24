import { describe, it, expect } from "vitest";
import { carriedText } from "../../../src/main/chunking/prompt";
import { text300, text80, tokens } from "../helpers/chunking";

describe("carriedText", () => {
  it("a long text is carried from a word start", () => {
    expect(tokens).toHaveLength(503);

    const carried = carriedText(tokens);

    expect(carried).toBe(tokens.slice(tokens.indexOf("token034")));
    expect(carried).toHaveLength(197);
  });

  it("a window that starts at a word keeps that word", () => {
    expect(text300).toHaveLength(300);

    const carried = carriedText(text300);

    expect(carried).toBe(text300.slice(100));
    expect(carried).toHaveLength(200);
    expect(carried.startsWith("w020 ")).toBe(true);
  });

  it("a short text is carried whole", () => {
    expect(text80).toHaveLength(80);

    expect(carriedText(text80)).toBe(text80);
  });

  it("a word longer than the window is carried as its last 200 characters", () => {
    expect(carriedText("x".repeat(250))).toBe("x".repeat(200));
  });

  it("an empty text carries nothing", () => {
    expect(carriedText("")).toBe("");
  });
});
