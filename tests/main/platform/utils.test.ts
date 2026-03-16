import { describe, it, expect } from "vitest";
import { applyCase, stripTrailingPeriod } from "../../../src/main/platform/utils";

describe("applyCase", () => {
  it("returns empty string unchanged", () => {
    expect(applyCase("", true)).toBe("");
  });

  it("lowercases first character when lowercaseStart is true", () => {
    expect(applyCase("Hello world", true)).toBe("hello world");
  });

  it("preserves original case when lowercaseStart is false", () => {
    expect(applyCase("Hello world", false)).toBe("Hello world");
  });
});

describe("stripTrailingPeriod", () => {
  it("returns text without trailing period unchanged", () => {
    expect(stripTrailingPeriod("Hello world")).toBe("Hello world");
  });

  it("strips trailing period from short text (3 words or fewer)", () => {
    expect(stripTrailingPeriod("Hello world.")).toBe("Hello world");
    expect(stripTrailingPeriod("One.")).toBe("One");
  });

  it("keeps trailing period for longer text (more than 3 words)", () => {
    expect(stripTrailingPeriod("This is a full sentence.")).toBe("This is a full sentence.");
  });
});
