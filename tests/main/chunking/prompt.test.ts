import { describe, it, expect } from "vitest";
import { carriedText } from "../../../src/main/chunking/prompt";

/** `count` words `<prefix>000`, `<prefix>001`, … joined by one space. */
function words(prefix: string, count: number): string {
  return Array.from({ length: count }, (_, i) => `${prefix}${String(i).padStart(3, "0")}`).join(" ");
}

describe("carriedText", () => {
  it("a long text is carried from a word start", () => {
    const tokens = words("token", 56);
    expect(tokens).toHaveLength(503);

    const carried = carriedText(tokens);

    expect(carried).toBe(tokens.slice(tokens.indexOf("token034")));
    expect(carried).toHaveLength(197);
  });

  it("a window that starts at a word keeps that word", () => {
    const text300 = `${words("w", 60)}.`;
    expect(text300).toHaveLength(300);

    const carried = carriedText(text300);

    expect(carried).toBe(text300.slice(100));
    expect(carried).toHaveLength(200);
    expect(carried.startsWith("w020 ")).toBe(true);
  });

  it("a short text is carried whole", () => {
    const text80 = words("word", 10).padEnd(80, "!");
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
