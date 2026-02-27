import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("electron", () => ({
  app: { isPackaged: false, getAppPath: () => "/fake" },
  BrowserWindow: vi.fn(),
  globalShortcut: { register: vi.fn(), unregisterAll: vi.fn() },
  ipcMain: { handle: vi.fn(), removeHandler: vi.fn(), on: vi.fn() },
  Notification: vi.fn().mockImplementation(() => ({ show: vi.fn() })),
  screen: { getPrimaryDisplay: vi.fn().mockReturnValue({ workAreaSize: { width: 1920, height: 1080 } }) },
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

import { ShortcutManager, type ShortcutManagerDeps } from "../../../src/main/shortcuts/manager";

function createMockPipeline(overrides: Record<string, unknown> = {}) {
  return {
    startRecording: vi.fn().mockResolvedValue(undefined),
    stopRecording: vi.fn().mockResolvedValue({ text: "" }),
    cancel: vi.fn().mockResolvedValue(undefined),
    playAudioCue: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createMockConfig(overrides: Record<string, unknown> = {}) {
  return {
    whisperModel: "base",
    language: "en",
    recordingAudioCue: "beep",
    holdShortcut: "Space",
    toggleShortcut: "CommandOrControl+Shift+A",
    ...overrides,
  };
}

describe("ShortcutManager — recording start flow", () => {
  let manager: ShortcutManager;
  let mockPipeline: ReturnType<typeof createMockPipeline>;
  let mockHud: { setState: ReturnType<typeof vi.fn>; showError: ReturnType<typeof vi.fn>; hide: ReturnType<typeof vi.fn> };
  let mockConfigManager: { load: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPipeline = createMockPipeline();
    mockConfigManager = { load: vi.fn().mockReturnValue(createMockConfig()) };

    manager = new ShortcutManager({
      configManager: mockConfigManager,
      getPipeline: () => mockPipeline,
    } as unknown as ShortcutManagerDeps);

    mockHud = {
      setState: vi.fn(),
      showError: vi.fn(),
      hide: vi.fn(),
      setShiftHeld: vi.fn(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- access private member for testing
    (manager as any).hud = mockHud;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- access private member for testing
    (manager as any).stateMachine = {
      setIdle: vi.fn(),
      setProcessing: vi.fn(),
      getState: vi.fn().mockReturnValue("hold"),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should set HUD to listening only AFTER playCue resolves", async () => {
    let resolveCue!: () => void;
    const cuePromise = new Promise<void>((resolve) => {
      resolveCue = resolve;
    });
    mockPipeline.playAudioCue.mockReturnValue(cuePromise);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- call private method for testing
    (manager as any).onRecordingStart();

    // Wait for startRecording to resolve (microtask)
    await mockPipeline.startRecording();
    // Allow the .then() callback to run
    await vi.waitFor(() => {
      expect(mockPipeline.playAudioCue).toHaveBeenCalled();
    });

    // While cue is still pending, setState("listening") should NOT have been called
    expect(mockHud.setState).not.toHaveBeenCalledWith("listening");

    // Now resolve the cue
    resolveCue();
    await cuePromise;

    // After cue resolves, setState("listening") should be called
    await vi.waitFor(() => {
      expect(mockHud.setState).toHaveBeenCalledWith("listening");
    });
  });

  it("should transition to listening within 1500ms even if cue hangs", async () => {
    vi.useFakeTimers();

    // Create a promise that never resolves
    mockPipeline.playAudioCue.mockReturnValue(new Promise<void>(() => {}));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- call private method for testing
    (manager as any).onRecordingStart();

    // Let startRecording resolve
    await mockPipeline.startRecording();
    // Flush microtask queue so .then() runs
    await vi.advanceTimersByTimeAsync(0);

    // Cue is hanging — listening should not yet be set
    expect(mockHud.setState).not.toHaveBeenCalledWith("listening");

    // Advance 1500ms — the timeout guard should fire
    await vi.advanceTimersByTimeAsync(1500);

    expect(mockHud.setState).toHaveBeenCalledWith("listening");

    vi.useRealTimers();
  });

  it("should transition immediately when cue is none", async () => {
    mockConfigManager.load.mockReturnValue(createMockConfig({ recordingAudioCue: "none" }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- call private method for testing
    (manager as any).onRecordingStart();

    // Let startRecording resolve and .then() callback execute
    await mockPipeline.startRecording();
    await vi.waitFor(() => {
      expect(mockHud.setState).toHaveBeenCalledWith("listening");
    });

    // playAudioCue should NOT have been invoked at all
    expect(mockPipeline.playAudioCue).not.toHaveBeenCalled();
  });
});
