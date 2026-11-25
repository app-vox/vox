import { describe, it, expect } from "vitest";
import { pasteOutcome } from "../../../src/main/shortcuts/paste-outcome";

describe("pasteOutcome", () => {
  it("warning after an incomplete transcript is pasted", () => {
    const inserted = true;

    expect(pasteOutcome(inserted, true)).toBe("incomplete");
    expect(pasteOutcome(inserted, false)).toBe("pasted");
  });

  it("insert failure keeps its own warning", () => {
    expect(pasteOutcome(false, true)).toBe("insert-failed");
    expect(pasteOutcome(false, false)).toBe("insert-failed");
  });
});
