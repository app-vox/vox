import { describe, it, expect, vi, beforeEach } from "vitest";
import { DoubleTapDetector } from "../../../src/main/shortcuts/double-tap";
import { DOUBLE_TAP_THRESHOLD_MS } from "../../../src/shared/shortcuts";

describe("DoubleTapDetector", () => {
  let detector: DoubleTapDetector;
  let onDoubleTap: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onDoubleTap = vi.fn();
    detector = new DoubleTapDetector(onDoubleTap);
  });

  it("fires callback on second keydown within threshold", () => {
    detector.handleKeyUp(100);
    detector.handleKeyDown(200);

    expect(onDoubleTap).toHaveBeenCalledOnce();
  });

  it("does not fire if interval exceeds threshold", () => {
    detector.handleKeyUp(100);
    detector.handleKeyDown(100 + DOUBLE_TAP_THRESHOLD_MS + 1);

    expect(onDoubleTap).not.toHaveBeenCalled();
  });

  it("resets when a non-modifier key is pressed between taps", () => {
    detector.handleKeyUp(100);
    detector.handleNonModifierKey();
    detector.handleKeyDown(200);

    expect(onDoubleTap).not.toHaveBeenCalled();
  });

  it("treats third tap as start of new sequence (not immediate re-trigger)", () => {
    detector.handleKeyUp(100);
    detector.handleKeyDown(200); // fires
    onDoubleTap.mockClear();

    // Third tap: keyup from second tap, then new keydown
    detector.handleKeyUp(250);
    detector.handleKeyDown(300);

    // Should NOT fire — the second keydown already consumed the sequence
    // The keyup at 250 starts a new sequence, but keydown at 200 was the trigger,
    // so we need a fresh keyup after the trigger to start a new sequence
    expect(onDoubleTap).not.toHaveBeenCalled();
  });

  it("does not fire on first keydown without prior keyup", () => {
    detector.handleKeyDown(100);
    expect(onDoubleTap).not.toHaveBeenCalled();
  });

  it("resets state via reset()", () => {
    detector.handleKeyUp(100);
    detector.reset();
    detector.handleKeyDown(200);

    expect(onDoubleTap).not.toHaveBeenCalled();
  });

  it("fires callback at exact threshold boundary", () => {
    detector.handleKeyUp(100);
    detector.handleKeyDown(100 + DOUBLE_TAP_THRESHOLD_MS);

    expect(onDoubleTap).toHaveBeenCalledOnce();
  });

  it("allows a new double-tap after a consumed sequence completes", () => {
    // First double-tap
    detector.handleKeyUp(100);
    detector.handleKeyDown(200); // fires
    onDoubleTap.mockClear();

    // Consumed key-up from second tap
    detector.handleKeyUp(250);

    // New full sequence
    detector.handleKeyUp(500);
    detector.handleKeyDown(600);

    expect(onDoubleTap).toHaveBeenCalledOnce();
  });
});
