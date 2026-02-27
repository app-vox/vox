import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockSetPosition,
  mockWindow,
  mockGetAllDisplays,
  mockGetPrimaryDisplay,
  mockGetDisplayNearestPoint,
} = vi.hoisted(() => {
  const mockSetPosition = vi.fn();
  const mockWindow = {
    setVisibleOnAllWorkspaces: vi.fn(),
    setIgnoreMouseEvents: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    loadURL: vi.fn(),
    isDestroyed: vi.fn().mockReturnValue(false),
    setPosition: mockSetPosition,
    showInactive: vi.fn(),
    hide: vi.fn(),
    blur: vi.fn(),
    destroy: vi.fn(),
    isVisible: vi.fn().mockReturnValue(true),
    getPosition: vi.fn().mockReturnValue([100, 200]),
    webContents: {
      executeJavaScript: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      send: vi.fn(),
    },
  };
  return {
    mockSetPosition,
    mockWindow,
    mockGetAllDisplays: vi.fn(),
    mockGetPrimaryDisplay: vi.fn(),
    mockGetDisplayNearestPoint: vi.fn(),
  };
});

vi.mock("electron", () => ({
  BrowserWindow: vi.fn().mockImplementation(() => mockWindow),
  screen: {
    getAllDisplays: mockGetAllDisplays,
    getPrimaryDisplay: mockGetPrimaryDisplay,
    getDisplayNearestPoint: mockGetDisplayNearestPoint,
    getCursorScreenPoint: vi.fn().mockReturnValue({ x: 500, y: 500 }),
  },
}));

vi.mock("fs", () => ({
  readFileSync: vi.fn().mockReturnValue(Buffer.from("fake-png")),
}));

vi.mock("../../src/main/resources", () => ({
  getResourcePath: vi.fn().mockReturnValue("/fake/logo.png"),
}));

vi.mock("../../src/shared/i18n", () => ({
  t: vi.fn((key: string) => key),
}));

import { HudWindow } from "../../src/main/hud";

const primaryDisplay = {
  id: 42,
  label: "Main",
  bounds: { x: 0, y: 0, width: 1920, height: 1080 },
  workArea: { x: 0, y: 25, width: 1920, height: 1055 },
};

const externalDisplay = {
  id: 99,
  label: "External",
  bounds: { x: 1920, y: 0, width: 2560, height: 1440 },
  workArea: { x: 1920, y: 25, width: 2560, height: 1415 },
};

function createHudWithWindow(): HudWindow {
  const hud = new HudWindow();
  // Directly set the internal window to the mock object,
  // bypassing show() which tries to require.resolve the preload script.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (hud as any).window = mockWindow;
  return hud;
}

describe("HudWindow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWindow.isDestroyed.mockReturnValue(false);
    mockGetAllDisplays.mockReturnValue([primaryDisplay, externalDisplay]);
    mockGetPrimaryDisplay.mockReturnValue(primaryDisplay);
    mockGetDisplayNearestPoint.mockReturnValue(primaryDisplay);
  });

  describe("reposition", () => {
    it("should position window on target display", () => {
      const hud = createHudWithWindow();
      hud.setTargetDisplay(externalDisplay.id);

      expect(mockSetPosition).toHaveBeenCalled();
      const [x] = mockSetPosition.mock.calls[0];
      expect(x).toBeGreaterThanOrEqual(externalDisplay.workArea.x);
    });

    it("should fall back to primary display when target display is disconnected", () => {
      const hud = createHudWithWindow();
      hud.setTargetDisplay(externalDisplay.id);

      mockGetAllDisplays.mockReturnValue([primaryDisplay]);
      mockSetPosition.mockClear();

      hud.reposition();

      expect(mockSetPosition).toHaveBeenCalled();
      const [x] = mockSetPosition.mock.calls[0];
      expect(x).toBeLessThan(externalDisplay.workArea.x);
    });

    it("should restore position on target display when it reconnects", () => {
      const hud = createHudWithWindow();
      hud.setTargetDisplay(externalDisplay.id);

      // Simulate disconnect — falls back to primary
      mockGetAllDisplays.mockReturnValue([primaryDisplay]);
      hud.reposition();

      // Simulate reconnect — should restore to external display
      mockGetAllDisplays.mockReturnValue([primaryDisplay, externalDisplay]);
      mockSetPosition.mockClear();

      hud.reposition();

      expect(mockSetPosition).toHaveBeenCalled();
      const [x] = mockSetPosition.mock.calls[0];
      expect(x).toBeGreaterThanOrEqual(externalDisplay.workArea.x);
    });

    it("should not throw when window is null", () => {
      const hud = new HudWindow();
      expect(() => hud.reposition()).not.toThrow();
    });

    it("should use cursor-based display when no target display is set", () => {
      mockGetDisplayNearestPoint.mockReturnValue(externalDisplay);
      const hud = createHudWithWindow();

      hud.reposition();

      expect(mockSetPosition).toHaveBeenCalled();
      const [x] = mockSetPosition.mock.calls[0];
      expect(x).toBeGreaterThanOrEqual(externalDisplay.workArea.x);
    });
  });

  describe("playAttentionAnimation", () => {
    it("should call executeJavaScript with playAttention()", () => {
      const hud = createHudWithWindow();
      // Simulate contentReady
      (hud as any).contentReady = true;

      hud.playAttentionAnimation();

      expect(mockWindow.webContents.executeJavaScript).toHaveBeenCalledWith(
        "playAttention()"
      );
    });

    it("should not throw when window is null", () => {
      const hud = new HudWindow();
      expect(() => hud.playAttentionAnimation()).not.toThrow();
    });

    it("should not call executeJavaScript when content is not ready", () => {
      const hud = createHudWithWindow();
      // contentReady defaults to false for new HudWindow
      (hud as any).contentReady = false;

      hud.playAttentionAnimation();

      expect(mockWindow.webContents.executeJavaScript).not.toHaveBeenCalled();
    });
  });
});
