// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("usePerformance DOM attributes", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-reduce-animations");
    document.documentElement.removeAttribute("data-reduce-effects");
  });

  afterEach(() => {
    document.documentElement.removeAttribute("data-reduce-animations");
    document.documentElement.removeAttribute("data-reduce-effects");
  });

  it("should export applyPerformanceFlags function", async () => {
    const { applyPerformanceFlags } = await import(
      "../../../src/renderer/hooks/use-performance"
    );
    expect(typeof applyPerformanceFlags).toBe("function");
  });

  it("should set data-reduce-animations when reduceAnimations is true", async () => {
    const { applyPerformanceFlags } = await import(
      "../../../src/renderer/hooks/use-performance"
    );
    applyPerformanceFlags(true, false);
    expect(document.documentElement.getAttribute("data-reduce-animations")).toBe("true");
    expect(document.documentElement.hasAttribute("data-reduce-effects")).toBe(false);
  });

  it("should set data-reduce-effects when reduceVisualEffects is true", async () => {
    const { applyPerformanceFlags } = await import(
      "../../../src/renderer/hooks/use-performance"
    );
    applyPerformanceFlags(false, true);
    expect(document.documentElement.hasAttribute("data-reduce-animations")).toBe(false);
    expect(document.documentElement.getAttribute("data-reduce-effects")).toBe("true");
  });

  it("should remove attributes when flags are false", async () => {
    const { applyPerformanceFlags } = await import(
      "../../../src/renderer/hooks/use-performance"
    );
    applyPerformanceFlags(true, true);
    expect(document.documentElement.getAttribute("data-reduce-animations")).toBe("true");
    expect(document.documentElement.getAttribute("data-reduce-effects")).toBe("true");
    applyPerformanceFlags(false, false);
    expect(document.documentElement.hasAttribute("data-reduce-animations")).toBe(false);
    expect(document.documentElement.hasAttribute("data-reduce-effects")).toBe(false);
  });
});
