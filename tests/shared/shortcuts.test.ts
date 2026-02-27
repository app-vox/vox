import { describe, it, expect } from "vitest";
import { isDoubleTap, getDoubleTapModifier, DOUBLE_TAP_PREFIX } from "../../src/shared/shortcuts";

describe("DOUBLE_TAP_PREFIX", () => {
  it("equals 'DoubleTap:'", () => {
    expect(DOUBLE_TAP_PREFIX).toBe("DoubleTap:");
  });
});

describe("isDoubleTap", () => {
  it("returns true for DoubleTap: prefixed strings", () => {
    expect(isDoubleTap("DoubleTap:Command")).toBe(true);
    expect(isDoubleTap("DoubleTap:Ctrl")).toBe(true);
    expect(isDoubleTap("DoubleTap:Alt")).toBe(true);
    expect(isDoubleTap("DoubleTap:Shift")).toBe(true);
  });

  it("returns false for regular accelerator strings", () => {
    expect(isDoubleTap("Alt+Space")).toBe(false);
    expect(isDoubleTap("Command+Shift+Space")).toBe(false);
    expect(isDoubleTap("")).toBe(false);
  });
});

describe("getDoubleTapModifier", () => {
  it("extracts the modifier name from a DoubleTap string", () => {
    expect(getDoubleTapModifier("DoubleTap:Command")).toBe("Command");
    expect(getDoubleTapModifier("DoubleTap:Ctrl")).toBe("Ctrl");
    expect(getDoubleTapModifier("DoubleTap:Alt")).toBe("Alt");
    expect(getDoubleTapModifier("DoubleTap:Shift")).toBe("Shift");
  });

  it("returns null for non-DoubleTap strings", () => {
    expect(getDoubleTapModifier("Alt+Space")).toBeNull();
    expect(getDoubleTapModifier("")).toBeNull();
  });
});
