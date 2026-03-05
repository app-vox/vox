import { describe, it, expect } from "vitest";

describe("selection", () => {
  it("exports getSelectedText function", async () => {
    const mod = await import("../../../src/main/input/selection");
    expect(mod.getSelectedText).toBeDefined();
    expect(typeof mod.getSelectedText).toBe("function");
  });

  it("returns empty string in test environment", async () => {
    const { getSelectedText } = await import(
      "../../../src/main/input/selection"
    );
    const result = await getSelectedText();
    expect(result).toBe("");
  });
});
