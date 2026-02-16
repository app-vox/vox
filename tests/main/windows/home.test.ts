import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  eventHandlers,
  appEventHandlers,
  mockHide,
  mockShow,
  mockFocus,
  mockIsDestroyed,
  mockIsMinimized,
  mockWebContents,
} = vi.hoisted(() => {
  // Ensure isMac evaluates to true when home.ts loads, even on Linux CI
  Object.defineProperty(process, "platform", { value: "darwin", writable: true });

  const eventHandlers: Record<string, (...args: unknown[]) => void> = {};
  const appEventHandlers: Record<string, (...args: unknown[]) => void> = {};
  return {
    eventHandlers,
    appEventHandlers,
    mockHide: vi.fn(),
    mockShow: vi.fn(),
    mockFocus: vi.fn(),
    mockIsDestroyed: vi.fn().mockReturnValue(false),
    mockIsMinimized: vi.fn().mockReturnValue(false),
    mockWebContents: { send: vi.fn(), on: vi.fn(), once: vi.fn() },
  };
});

vi.mock("electron", () => {
  class MockBrowserWindow {
    webContents = mockWebContents;
    on(event: string, handler: (...args: unknown[]) => void) { eventHandlers[event] = handler; }
    hide = mockHide;
    show = mockShow;
    focus = mockFocus;
    restore = vi.fn();
    loadFile = vi.fn();
    loadURL = vi.fn();
    isDestroyed = mockIsDestroyed;
    isMinimized = mockIsMinimized;
  }
  return {
    app: {
      isPackaged: true,
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        appEventHandlers[event] = handler;
      }),
    },
    BrowserWindow: MockBrowserWindow,
    Menu: {
      buildFromTemplate: vi.fn().mockReturnValue({}),
      setApplicationMenu: vi.fn(),
    },
    nativeTheme: { shouldUseDarkColors: false },
    screen: {
      getCursorScreenPoint: vi.fn().mockReturnValue({ x: 0, y: 0 }),
      getDisplayNearestPoint: vi.fn().mockReturnValue({
        bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      }),
    },
  };
});

vi.mock("electron-log/main", () => ({
  default: {
    scope: vi.fn().mockReturnValue({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

import { openHome } from "../../../src/main/windows/home";

describe("home window macOS close behavior", () => {
  const onClosed = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(eventHandlers).forEach((k) => delete eventHandlers[k]);
    // Mark any leftover window as destroyed so openHome creates a fresh one
    mockIsDestroyed.mockReturnValue(true);
    mockIsMinimized.mockReturnValue(false);
  });

  it("registers a close handler on macOS", () => {
    openHome(onClosed);
    expect(eventHandlers["close"]).toBeDefined();
  });

  it("hides window instead of destroying on close", () => {
    openHome(onClosed);
    const closeHandler = eventHandlers["close"];
    const event = { preventDefault: vi.fn() };

    closeHandler(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(mockHide).toHaveBeenCalled();
  });

  it("allows actual close when app is quitting", () => {
    openHome(onClosed);

    const beforeQuitHandler = appEventHandlers["before-quit"];
    expect(beforeQuitHandler).toBeDefined();
    beforeQuitHandler();

    const closeHandler = eventHandlers["close"];
    const event = { preventDefault: vi.fn() };
    closeHandler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(mockHide).not.toHaveBeenCalled();
  });

  it("re-shows hidden window on subsequent openHome call", () => {
    openHome(onClosed);
    // Window now exists; mark it as alive for the second call
    mockIsDestroyed.mockReturnValue(false);
    mockShow.mockClear();
    mockFocus.mockClear();

    openHome(onClosed);

    expect(mockShow).toHaveBeenCalled();
    expect(mockFocus).toHaveBeenCalled();
  });
});
