import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const { registered, failing, notifications, ipcHandlers, hudWindow } = vi.hoisted(() => ({
  registered: new Map<string, () => void>(),
  failing: new Set<string>(),
  notifications: [] as { title: string; body: string }[],
  ipcHandlers: new Map<string, () => void>(),
  hudWindow: {
    isDestroyed: () => false,
    isVisible: () => true,
    showInactive: () => {},
    hide: () => {},
    destroy: () => {},
    webContents: { executeJavaScript: () => Promise.resolve() },
  },
}));

// Electron cannot run in the test process: globalShortcut records registrations and refuses `failing`
// accelerators, Notification records what it would show, ipcMain records its handlers, and no settings window is open.
vi.mock("electron", () => ({
  app: { isPackaged: false, getAppPath: () => "/fake", getLocale: () => "en-US", getVersion: () => "1.0.0", on: () => {} },
  BrowserWindow: { getAllWindows: () => [] },
  globalShortcut: {
    register: (accelerator: string, callback: () => void) => {
      if (failing.has(accelerator)) return false;
      registered.set(accelerator, callback);
      return true;
    },
    unregisterAll: () => registered.clear(),
  },
  Notification: class {
    constructor(private readonly options: { title: string; body: string }) {}
    show(): void { notifications.push(this.options); }
  },
  ipcMain: { handle: (channel: string, handler: () => void) => ipcHandlers.set(channel, handler), on: () => {} },
  screen: { on: () => {}, removeListener: () => {} },
  nativeTheme: { on: () => {}, off: () => {}, shouldUseDarkColors: false },
  clipboard: { writeText: () => {} },
}));

// The keyboard hook is a native module built for Electron and cannot load in the test process.
vi.mock("uiohook-napi", () => ({
  uIOhook: { on: () => {}, start: () => {}, stop: () => {} },
  UiohookKey: new Proxy({}, { get: () => 0 }),
}));

import { ConfigManager, type SecretStore } from "../../../src/main/config/manager";
import { PromptSwitch } from "../../../src/main/prompt-switch";
import { ShortcutManager } from "../../../src/main/shortcuts/manager";
import { type Pipeline } from "../../../src/main/pipeline";
import { type VoxConfig } from "../../../src/shared/config";
import { computeLlmConfigHash } from "../../../src/shared/llm-config-hash";
import { t } from "../../../src/shared/i18n";

const secrets: SecretStore = { encrypt: (v) => v, decrypt: (v) => v };
const NEXT = "Alt+Shift+P";

describe("Next-prompt shortcut", () => {
  let testDir: string;
  let configManager: ConfigManager;
  let manager: ShortcutManager;
  let announced: Mock<(config: VoxConfig) => void>;
  // The pipeline drives the microphone and the speech model, which cannot run here: a recording starts and never ends.
  const pipeline = {
    cancel: () => Promise.resolve(),
    startRecording: () => Promise.resolve(),
    playAudioCue: () => Promise.resolve(),
  };

  function saveConfig(edit: (config: VoxConfig) => void): void {
    const config = configManager.load();
    config.enableLlmEnhancement = true;
    config.llmConnectionTested = true;
    config.llm = { provider: "openai", openaiEndpoint: "https://api.openai.com", openaiApiKey: "sk-test", openaiModel: "gpt-4o" };
    config.llmConfigHash = computeLlmConfigHash(config);
    config.prompts = [
      { id: "first", name: "Cleanup", icon: "🧹", instructions: "Clean it up." },
      { id: "second", name: "Translate to German", icon: "🇩🇪", instructions: "Translate to German." },
      { id: "third", name: "Translate to English", icon: "🇬🇧", instructions: "Translate to English." },
    ];
    config.activePromptId = "first";
    config.shortcuts = { mode: "toggle", hold: "Alt+Space", toggle: "Alt+Shift+Space", nextPrompt: NEXT };
    config.showHud = true;
    config.recordingAudioCue = "none";
    config.alwaysShowPreview = false;
    edit(config);
    configManager.save(config);
  }

  function press(accelerator: string): void {
    const callback = registered.get(accelerator);
    if (!callback) throw new Error(`${accelerator} is not registered`);
    callback();
  }

  beforeEach(() => {
    vi.useFakeTimers();
    registered.clear();
    failing.clear();
    notifications.length = 0;
    ipcHandlers.clear();
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "vox-prompt-cycle-"));
    configManager = new ConfigManager(testDir, secrets);
    const promptSwitch = new PromptSwitch(configManager);
    announced = vi.fn((config: VoxConfig) => promptSwitch.saveAndAnnounce(config));
    manager = new ShortcutManager({
      configManager,
      // The stub covers only the calls a recording start makes.
      getPipeline: () => pipeline as unknown as Pipeline,
      hasModel: () => true,
      setActivePrompt: (id) => promptSwitch.setActivePrompt(id),
      saveAndAnnounce: announced,
    });
    // The HUD's BrowserWindow cannot run here: a loaded window stands in for the one the HUD creates lazily.
    Object.assign(manager.getHud(), { window: hudWindow, contentReady: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it("wraps from last prompt to none then first", () => {
    saveConfig((config) => { config.activePromptId = "third"; });
    manager.registerShortcutKeys();

    press(NEXT);
    expect(configManager.load().activePromptId).toBeNull();

    press(NEXT);
    expect(configManager.load().activePromptId).toBe("first");
  });

  it("unset shortcut leaves the active prompt", () => {
    saveConfig((config) => { config.shortcuts.nextPrompt = ""; });
    manager.registerShortcutKeys();

    expect([...registered.keys()]).toEqual(["Alt+Shift+Space"]);
    expect(configManager.load().activePromptId).toBe("first");
    expect(notifications).toEqual([]);
  });

  it("failed next-prompt registration does not reset hold and toggle", () => {
    saveConfig((config) => {
      config.shortcuts = { mode: "both", hold: "Ctrl+Space", toggle: "Ctrl+Shift+Space", nextPrompt: NEXT };
    });
    failing.add(NEXT);
    manager.registerShortcutKeys();

    expect(configManager.load().shortcuts).toEqual({
      mode: "both", hold: "Ctrl+Space", toggle: "Ctrl+Shift+Space", nextPrompt: "",
    });
    expect(notifications).toEqual([{
      title: t("notification.nextPromptCleared.title"),
      body: t("notification.nextPromptCleared.body"),
    }]);

    // A failing recording shortcut resets hold and toggle, but keeps the user's Next prompt.
    saveConfig((config) => { config.shortcuts.toggle = "Ctrl+Shift+T"; });
    failing.clear();
    failing.add("Ctrl+Shift+T");
    manager.registerShortcutKeys();

    expect(configManager.load().shortcuts).toEqual({
      mode: "toggle", hold: "Alt+Space", toggle: "Alt+Shift+Space", nextPrompt: NEXT,
    });
  });

  it("a failed next-prompt registration announces the cleared shortcut through the shared save", () => {
    saveConfig(() => {});
    failing.add(NEXT);
    manager.registerShortcutKeys();

    expect(announced).toHaveBeenCalledOnce();
    expect(announced.mock.calls[0][0].shortcuts.nextPrompt).toBe("");
    expect(configManager.load().shortcuts.nextPrompt).toBe("");
  });

  it("turning the HUD off announces it through the shared save", () => {
    saveConfig(() => {});
    manager.start();

    ipcHandlers.get("hud:disable")!();

    expect(announced).toHaveBeenCalledOnce();
    expect(announced.mock.calls[0][0].showHud).toBe(false);
    expect(configManager.load().showHud).toBe(false);
  });

  it("shortcut notifies and does not switch while the connection is untested", () => {
    saveConfig((config) => { config.llmConnectionTested = false; });
    manager.registerShortcutKeys();

    press(NEXT);

    expect(configManager.load().activePromptId).toBe("first");
    expect(notifications).toEqual([{
      title: t("notification.promptNotReady.title"),
      body: t("notification.promptNotReady.body"),
    }]);
    expect(t("notification.promptNotReady.body")).toContain("Settings → AI Enhancement");
  });

  it("idle with the HUD on flashes the switched prompt in the HUD", () => {
    saveConfig(() => {});
    manager.registerShortcutKeys();

    press(NEXT);

    expect(configManager.load().activePromptId).toBe("second");
    expect(manager.getHud().getState()).toBe("prompt");
    expect(notifications).toEqual([]);
  });

  it("busy or HUD off uses a notification", async () => {
    saveConfig((config) => { config.showHud = false; });
    manager.registerShortcutKeys();

    press(NEXT);

    expect(configManager.load().activePromptId).toBe("second");
    expect(notifications).toEqual([{ title: t("notification.promptSwitched.title"), body: "🇩🇪 Translate to German" }]);
    expect(manager.getHud().getState()).toBe("idle");

    saveConfig((config) => { config.activePromptId = "third"; });
    manager.registerShortcutKeys();
    await vi.advanceTimersByTimeAsync(300);
    press("Alt+Shift+Space");
    await vi.advanceTimersByTimeAsync(0);
    expect(manager.getHud().getState()).toBe("listening");
    notifications.length = 0;

    press(NEXT);

    expect(configManager.load().activePromptId).toBeNull();
    expect(notifications).toEqual([{ title: t("notification.promptSwitched.title"), body: t("llm.prompts.none") }]);
    expect(manager.getHud().getState()).toBe("listening");
  });
});
