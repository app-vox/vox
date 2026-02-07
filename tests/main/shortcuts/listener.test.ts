import { describe, it, expect, vi } from "vitest";
import { ShortcutStateMachine } from "../../../src/main/shortcuts/listener";

describe("ShortcutStateMachine", () => {
  it("should emit start on hold key down", () => {
    const onStart = vi.fn();
    const onStop = vi.fn();
    const sm = new ShortcutStateMachine({ onStart, onStop });

    sm.handleHoldKeyDown();

    expect(onStart).toHaveBeenCalledOnce();
    expect(onStop).not.toHaveBeenCalled();
    expect(sm.getState()).toBe("hold");
  });

  it("should emit stop on hold key up", () => {
    const onStart = vi.fn();
    const onStop = vi.fn();
    const sm = new ShortcutStateMachine({ onStart, onStop });

    sm.handleHoldKeyDown();
    sm.handleHoldKeyUp();

    expect(onStart).toHaveBeenCalledOnce();
    expect(onStop).toHaveBeenCalledOnce();
    expect(sm.getState()).toBe("idle");
  });

  it("should ignore duplicate hold key down events", () => {
    const onStart = vi.fn();
    const onStop = vi.fn();
    const sm = new ShortcutStateMachine({ onStart, onStop });

    sm.handleHoldKeyDown();
    sm.handleHoldKeyDown();
    sm.handleHoldKeyDown();

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(sm.getState()).toBe("hold");
  });

  it("should ignore hold key up when not in hold state", () => {
    const onStart = vi.fn();
    const onStop = vi.fn();
    const sm = new ShortcutStateMachine({ onStart, onStop });

    sm.handleHoldKeyUp(); // idle — should be ignored

    expect(onStop).not.toHaveBeenCalled();
    expect(sm.getState()).toBe("idle");
  });

  it("should toggle on first press and stop on second press", () => {
    const onStart = vi.fn();
    const onStop = vi.fn();
    const sm = new ShortcutStateMachine({ onStart, onStop });

    sm.handleTogglePress();
    expect(onStart).toHaveBeenCalledOnce();
    expect(sm.getState()).toBe("toggle");

    sm.handleTogglePress();
    expect(onStop).toHaveBeenCalledOnce();
    expect(sm.getState()).toBe("idle");
  });

  it("should promote hold to toggle when toggle is pressed during hold", () => {
    const onStart = vi.fn();
    const onStop = vi.fn();
    const sm = new ShortcutStateMachine({ onStart, onStop });

    sm.handleHoldKeyDown(); // enters hold
    expect(sm.getState()).toBe("hold");

    sm.handleTogglePress(); // promotes to toggle
    expect(sm.getState()).toBe("toggle");
    expect(onStart).toHaveBeenCalledTimes(1); // no duplicate onStart
    expect(onStop).not.toHaveBeenCalled();

    // Key up should NOT stop recording since we promoted to toggle
    sm.handleHoldKeyUp();
    expect(onStop).not.toHaveBeenCalled();
    expect(sm.getState()).toBe("toggle");

    // Second toggle press stops recording
    sm.handleTogglePress();
    expect(onStop).toHaveBeenCalledOnce();
    expect(sm.getState()).toBe("idle");
  });

  it("should ignore hold key down while processing", () => {
    const onStart = vi.fn();
    const onStop = vi.fn();
    const sm = new ShortcutStateMachine({ onStart, onStop });

    sm.setProcessing();
    sm.handleHoldKeyDown();

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

  it("should ignore hold key up while processing", () => {
    const onStart = vi.fn();
    const onStop = vi.fn();
    const sm = new ShortcutStateMachine({ onStart, onStop });

    sm.handleHoldKeyDown();
    sm.setProcessing();
    sm.handleHoldKeyUp();

    expect(onStop).not.toHaveBeenCalled();
    expect(sm.getState()).toBe("processing");
  });
});
