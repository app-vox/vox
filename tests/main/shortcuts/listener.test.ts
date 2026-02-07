import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ShortcutStateMachine } from "../../../src/main/shortcuts/listener";

describe("ShortcutStateMachine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should emit start on first hold key repeat", () => {
    const onStart = vi.fn();
    const onStop = vi.fn();
    const sm = new ShortcutStateMachine({ onStart, onStop });

    sm.handleHoldKeyRepeat();

    expect(onStart).toHaveBeenCalledOnce();
    expect(onStop).not.toHaveBeenCalled();
  });

  it("should emit stop when hold key repeats stop (key released)", () => {
    const onStart = vi.fn();
    const onStop = vi.fn();
    const sm = new ShortcutStateMachine({ onStart, onStop });

    sm.handleHoldKeyRepeat();
    expect(onStart).toHaveBeenCalledOnce();

    // Simulate key release by letting the timer expire
    vi.advanceTimersByTime(400);

    expect(onStop).toHaveBeenCalledOnce();
    expect(sm.getState()).toBe("idle");
  });

  it("should not emit stop while key repeats continue", () => {
    const onStart = vi.fn();
    const onStop = vi.fn();
    const sm = new ShortcutStateMachine({ onStart, onStop });

    sm.handleHoldKeyRepeat();

    // Simulate key repeats every 100ms (before 400ms timeout)
    vi.advanceTimersByTime(300);
    sm.handleHoldKeyRepeat();
    vi.advanceTimersByTime(300);
    sm.handleHoldKeyRepeat();
    vi.advanceTimersByTime(300);

    expect(onStop).not.toHaveBeenCalled();
    expect(sm.getState()).toBe("hold");

    // Now release (let timeout expire)
    vi.advanceTimersByTime(400);
    expect(onStop).toHaveBeenCalledOnce();
  });

  it("should toggle on first press and stop on second press", () => {
    const onStart = vi.fn();
    const onStop = vi.fn();
    const sm = new ShortcutStateMachine({ onStart, onStop });

    sm.handleTogglePress();
    expect(onStart).toHaveBeenCalledOnce();

    sm.handleTogglePress();
    expect(onStop).toHaveBeenCalledOnce();
  });

  it("should not allow toggle during hold", () => {
    const onStart = vi.fn();
    const onStop = vi.fn();
    const sm = new ShortcutStateMachine({ onStart, onStop });

    sm.handleHoldKeyRepeat();
    sm.handleTogglePress(); // should be ignored

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(sm.getState()).toBe("hold");
  });

  it("should only emit start once for multiple hold repeats", () => {
    const onStart = vi.fn();
    const onStop = vi.fn();
    const sm = new ShortcutStateMachine({ onStart, onStop });

    sm.handleHoldKeyRepeat();
    sm.handleHoldKeyRepeat();
    sm.handleHoldKeyRepeat();

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("should ignore hold key repeats while processing", () => {
    const onStart = vi.fn();
    const onStop = vi.fn();
    const sm = new ShortcutStateMachine({ onStart, onStop });

    sm.setProcessing();
    sm.handleHoldKeyRepeat();

    expect(onStart).not.toHaveBeenCalled();
    expect(sm.getState()).toBe("processing");
  });

  it("should ignore toggle presses while processing", () => {
    const onStart = vi.fn();
    const onStop = vi.fn();
    const sm = new ShortcutStateMachine({ onStart, onStop });

    sm.setProcessing();
    sm.handleTogglePress();

    expect(onStart).not.toHaveBeenCalled();
    expect(sm.getState()).toBe("processing");
  });

  it("should transition processing → idle via setIdle()", () => {
    const onStart = vi.fn();
    const onStop = vi.fn();
    const sm = new ShortcutStateMachine({ onStart, onStop });

    sm.setProcessing();
    expect(sm.getState()).toBe("processing");

    sm.setIdle();
    expect(sm.getState()).toBe("idle");

    // Should accept input again
    sm.handleTogglePress();
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("should clear pending hold timer when entering processing", () => {
    const onStart = vi.fn();
    const onStop = vi.fn();
    const sm = new ShortcutStateMachine({ onStart, onStop });

    // Start a hold (creates timer)
    sm.handleHoldKeyRepeat();
    expect(sm.getState()).toBe("hold");

    // Simulate: hold timer fires → idle → onStop called → setProcessing
    vi.advanceTimersByTime(400);
    expect(onStop).toHaveBeenCalledOnce();
    sm.setProcessing();

    // Additional timer ticks should not cause another onStop
    vi.advanceTimersByTime(1000);
    expect(onStop).toHaveBeenCalledTimes(1);
  });
});
