import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("electron", () => ({
  app: { isPackaged: false, getAppPath: () => "/fake" },
  BrowserWindow: Object.assign(vi.fn(), { getAllWindows: vi.fn().mockReturnValue([]) }),
  globalShortcut: { register: vi.fn().mockReturnValue(true), unregisterAll: vi.fn() },
  ipcMain: { handle: vi.fn(), removeHandler: vi.fn(), on: vi.fn() },
  Notification: vi.fn(function () { return { show: vi.fn() }; }),
  screen: {
    getPrimaryDisplay: vi.fn().mockReturnValue({ workAreaSize: { width: 1920, height: 1080 } }),
    on: vi.fn(),
    removeListener: vi.fn(),
  },
}));

vi.mock("electron-log/main", () => ({
  default: {
    scope: vi.fn().mockReturnValue({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      verbose: vi.fn(),
    }),
  },
}));

vi.mock("uiohook-napi", () => ({
  uIOhook: { on: vi.fn(), start: vi.fn(), stop: vi.fn() },
  UiohookKey: {
    Meta: 3675, MetaRight: 3676, Ctrl: 29, CtrlRight: 3613,
    Alt: 56, AltRight: 3640, Shift: 42, ShiftRight: 54, Space: 57,
    Enter: 28, Backspace: 14, Tab: 15, Delete: 3667,
    Home: 3655, End: 3663, PageUp: 3657, PageDown: 3665,
    ArrowUp: 3656, ArrowDown: 3664, ArrowLeft: 3658, ArrowRight: 3662,
    Escape: 1,
    F1: 59, F2: 60, F3: 61, F4: 62, F5: 63, F6: 64,
    F7: 65, F8: 66, F9: 67, F10: 68, F11: 87, F12: 88,
    F13: 91, F14: 92, F15: 93, F16: 94, F17: 95, F18: 96,
    F19: 97, F20: 98, F21: 99, F22: 100, F23: 101, F24: 102,
    A: 30, B: 48, C: 46, D: 32, E: 18, F: 33, G: 34, H: 35,
    I: 23, J: 36, K: 37, L: 38, M: 50, N: 49, O: 24, P: 25,
    Q: 16, R: 19, S: 31, T: 20, U: 22, V: 47, W: 17, X: 45,
    Y: 21, Z: 44,
    0: 11, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10,
    Minus: 12, Equal: 13, BracketLeft: 26, BracketRight: 27,
    Backslash: 43, Semicolon: 39, Quote: 40, Comma: 51,
    Period: 52, Slash: 53, Backquote: 41,
  },
}));

vi.mock("fs", () => ({
  readFileSync: vi.fn().mockReturnValue(Buffer.alloc(44)),
  existsSync: vi.fn().mockReturnValue(true),
}));

vi.mock("../../../src/shared/audio-cue", () => ({
  isWavCue: vi.fn().mockReturnValue(false),
  getWavFilename: vi.fn(),
  generateCueSamples: vi.fn().mockReturnValue([0.1, 0.2]),
  parseWavSamples: vi.fn(),
}));

vi.mock("../../../src/shared/i18n", () => ({
  t: vi.fn((key: string) => key),
}));

vi.mock("../../../src/main/hud", () => {
  return {
    HudWindow: class {
      setState = vi.fn();
      showError = vi.fn();
      hide = vi.fn();
      show = vi.fn();
      destroy = vi.fn();
      setShiftHeld = vi.fn();
      setTargetDisplay = vi.fn();
      setCustomPosition = vi.fn();
      setShowActions = vi.fn();
      setPerformanceFlags = vi.fn();
    },
  };
});

vi.mock("../../../src/main/tray", () => ({
  setTrayListeningState: vi.fn(),
  updateTrayConfig: vi.fn(),
}));

vi.mock("../../../src/main/input/paster", () => ({
  pasteText: vi.fn(),
  isAccessibilityGranted: vi.fn().mockReturnValue(true),
}));

import { uIOhook } from "uiohook-napi";
import { globalShortcut, ipcMain, Notification } from "electron";
import { ShortcutManager, type ShortcutManagerDeps } from "../../../src/main/shortcuts/manager";
import { RecordingState } from "../../../src/main/shortcuts/listener";

const META_LEFT = 3675;

function createMockPipeline() {
  return {
    startRecording: vi.fn().mockResolvedValue(undefined),
    stopAndProcess: vi.fn().mockResolvedValue("hello"),
    cancel: vi.fn().mockResolvedValue(undefined),
    playAudioCue: vi.fn().mockResolvedValue(undefined),
    gracefulCancel: vi.fn().mockReturnValue({ stage: "recording" }),
    confirmCancel: vi.fn(),
    undoCancel: vi.fn().mockResolvedValue("hello"),
  };
}

function createDoubleTapConfig(
  mode: "hold" | "toggle" | "both" = "both",
  hold = "DoubleTap:Command",
  toggle = "DoubleTap:Command",
) {
  return {
    whisperModel: "base",
    language: "en",
    recordingAudioCue: "none",
    recordingStopAudioCue: "none",
    errorAudioCue: "none",
    showHud: false,
    hudPosition: "top-right",
    hudShowOnHover: false,
    showHudActions: false,
    reduceAnimations: false,
    reduceVisualEffects: false,
    copyToClipboard: false,
    lowercaseStart: false,
    shiftCapitalize: false,
    onboardingCompleted: true,
    shortcuts: { mode, hold, toggle },
  };
}

/**
 * Capture uiohook event handlers registered during manager.start().
 * Returns functions to simulate keydown and keyup events.
 */
function captureUiohookHandlers() {
  const handlers: Record<string, (e: Record<string, unknown>) => void> = {};
  (uIOhook.on as ReturnType<typeof vi.fn>).mockImplementation(
    (event: string, handler: (e: Record<string, unknown>) => void) => {
      handlers[event] = handler;
    },
  );

  return {
    keydown: (keycode: number) =>
      handlers.keydown?.({
        keycode,
        shiftKey: false,
        ctrlKey: false,
        altKey: false,
        metaKey: false,
      }),
    keyup: (keycode: number) =>
      handlers.keyup?.({
        keycode,
        shiftKey: false,
        ctrlKey: false,
        altKey: false,
        metaKey: false,
      }),
  };
}

/**
 * Capture the shortcuts:disable IPC handler registered during manager.start().
 */
function captureDisableHandler(): () => void {
  const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls;
  const match = calls.find(([channel]: [string]) => channel === "shortcuts:disable");
  return match ? match[1] : () => {};
}

describe("ShortcutManager — double-tap integration", () => {
  let manager: ShortcutManager;
  let mockPipeline: ReturnType<typeof createMockPipeline>;
  let sim: ReturnType<typeof captureUiohookHandlers>;

  function buildManager(config = createDoubleTapConfig()) {
    mockPipeline = createMockPipeline();
    const mockConfigManager = { load: vi.fn().mockReturnValue(config), save: vi.fn() };

    sim = captureUiohookHandlers();

    manager = new ShortcutManager({
      configManager: mockConfigManager,
      getPipeline: () => mockPipeline,
      hasModel: () => true,
    } as unknown as ShortcutManagerDeps);

    manager.start();

    // Skip initialization delay
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (manager as any).isInitializing = false;

    return mockConfigManager;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("hold priority when both slots share same modifier", () => {
    it("activates hold mode on double-tap + hold", () => {
      buildManager();

      // First tap: keydown + keyup
      sim.keydown(META_LEFT);
      sim.keyup(META_LEFT);

      // Second tap (keydown only — user holds)
      vi.advanceTimersByTime(200);
      sim.keydown(META_LEFT);

      // Hold should have activated (pipeline starts)
      expect(manager.getStateMachineState()).toBe(RecordingState.Hold);
    });

    it("switches to toggle on quick release (<300ms)", () => {
      buildManager();

      // First tap
      sim.keydown(META_LEFT);
      sim.keyup(META_LEFT);

      // Second tap — quick double-tap
      vi.advanceTimersByTime(200);
      sim.keydown(META_LEFT);

      expect(manager.getStateMachineState()).toBe(RecordingState.Hold);

      // Quick release within 300ms
      vi.advanceTimersByTime(100);
      sim.keyup(META_LEFT);

      expect(manager.getStateMachineState()).toBe(RecordingState.Toggle);
    });

    it("stays in hold on slow release (>=300ms)", () => {
      buildManager();

      // First tap
      sim.keydown(META_LEFT);
      sim.keyup(META_LEFT);

      // Second tap + hold
      vi.advanceTimersByTime(200);
      sim.keydown(META_LEFT);

      // Wait longer than HOLD_TAP_THRESHOLD_MS
      vi.advanceTimersByTime(350);
      sim.keyup(META_LEFT);

      // State should be idle (hold released → recording stopped)
      expect(manager.getStateMachineState()).toBe(RecordingState.Idle);
    });
  });

  describe("stopping toggle mode with double-tap", () => {
    it("stops toggle recording on second double-tap", () => {
      buildManager();

      // Activate toggle via quick double-tap
      sim.keydown(META_LEFT);
      sim.keyup(META_LEFT);
      vi.advanceTimersByTime(200);
      sim.keydown(META_LEFT);
      vi.advanceTimersByTime(100);
      sim.keyup(META_LEFT);

      expect(manager.getStateMachineState()).toBe(RecordingState.Toggle);

      // Wait a bit (simulate user recording)
      vi.advanceTimersByTime(2000);

      // Second double-tap to stop
      sim.keydown(META_LEFT);
      sim.keyup(META_LEFT);
      vi.advanceTimersByTime(200);
      sim.keydown(META_LEFT);

      // Toggle should have stopped → processing/idle
      expect(manager.getStateMachineState()).not.toBe(RecordingState.Toggle);
    });
  });

  describe("shortcuts:disable during recording", () => {
    it("fully disables all shortcut state", () => {
      buildManager();
      const disableHandler = captureDisableHandler();

      disableHandler();

      // All double-tap state should be cleared
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const m = manager as any;
      expect(m.doubleTapHoldDetector).toBeNull();
      expect(m.doubleTapToggleDetector).toBeNull();
      expect(m.doubleTapHoldKeycode).toBe(0);
      expect(m.doubleTapToggleKeycode).toBe(0);
      expect(m.doubleTapHoldActive).toBe(false);
      expect(m.doubleTapHoldActivatedAt).toBe(0);
      expect(m.holdKeyCodes.size).toBe(0);
      expect(m.isInitializing).toBe(true);
    });

    it("does not trigger pipeline when tapping modifier after disable", () => {
      buildManager();
      const disableHandler = captureDisableHandler();

      disableHandler();

      // Simulate user double-tapping during shortcut recording
      sim.keydown(META_LEFT);
      sim.keyup(META_LEFT);
      vi.advanceTimersByTime(200);
      sim.keydown(META_LEFT);
      sim.keyup(META_LEFT);

      // State should remain idle — no recording triggered
      expect(manager.getStateMachineState()).toBe(RecordingState.Idle);
      expect(mockPipeline.startRecording).not.toHaveBeenCalled();
    });
  });

  describe("different modifiers for hold and toggle", () => {
    it("does not skip toggle when hold uses a different modifier", () => {
      buildManager(createDoubleTapConfig("both", "DoubleTap:Command", "DoubleTap:Shift"));

      const SHIFT_LEFT = 42;

      // Double-tap Shift for toggle
      sim.keydown(SHIFT_LEFT);
      sim.keyup(SHIFT_LEFT);
      vi.advanceTimersByTime(200);
      sim.keydown(SHIFT_LEFT);

      expect(manager.getStateMachineState()).toBe(RecordingState.Toggle);
    });
  });

  describe("invalid accelerator strings", () => {
    it("does not crash and resets config when globalShortcut.register throws", () => {
      (globalShortcut.register as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new TypeError("Error processing argument at index 0, conversion failure from InvalidKey");
      });

      const mockConfigManager = buildManager(createDoubleTapConfig("hold", "InvalidKey", "Alt+Shift+Space"));

      // Config should be saved with defaults
      expect(mockConfigManager.save).toHaveBeenCalledOnce();
      const savedConfig = mockConfigManager.save.mock.calls[0][0];
      expect(savedConfig.shortcuts.hold).toBe("Alt+Space");
      expect(savedConfig.shortcuts.toggle).toBe("Alt+Shift+Space");
      expect(savedConfig.shortcuts.mode).toBe("toggle");

      // User should be notified
      expect(Notification).toHaveBeenCalledOnce();

      (globalShortcut.register as ReturnType<typeof vi.fn>).mockReturnValue(true);
    });

    it("does not crash and resets config when toggle accelerator is invalid", () => {
      (globalShortcut.register as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new TypeError("Error processing argument at index 0, conversion failure from InvalidKey");
      });

      const mockConfigManager = buildManager(createDoubleTapConfig("toggle", "Alt+Space", "InvalidKey"));

      expect(mockConfigManager.save).toHaveBeenCalledOnce();
      expect(Notification).toHaveBeenCalledOnce();

      (globalShortcut.register as ReturnType<typeof vi.fn>).mockReturnValue(true);
    });
  });
});
