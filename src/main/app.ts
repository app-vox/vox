import { app, globalShortcut, ipcMain, session, BrowserWindow, Tray, Menu, nativeImage, Notification } from "electron";
import * as path from "path";
import { uIOhook, UiohookKey } from "uiohook-napi";
import { ConfigManager } from "./config/manager";
import { ModelManager } from "./models/manager";
import { AudioRecorder } from "./audio/recorder";
import { transcribe } from "./audio/whisper";
import { createLlmProvider } from "./llm/factory";
import { pasteText } from "./input/paster";
import { Pipeline } from "./pipeline";
import { ShortcutStateMachine } from "./shortcuts/listener";
import { IndicatorWindow } from "./indicator";
import { registerIpcHandlers } from "./ipc";

let tray: Tray | null = null;
let pipeline: Pipeline | null = null;
let indicator: IndicatorWindow | null = null;
let settingsWindow: BrowserWindow | null = null;

const configDir = path.join(app.getPath("userData"));
const modelsDir = path.join(configDir, "models");
const configManager = new ConfigManager(configDir);
const modelManager = new ModelManager(modelsDir);

function setupPipeline(): void {
  const config = configManager.load();
  const modelPath = modelManager.getModelPath(config.whisper.model);

  const llmProvider = createLlmProvider(config.llm);

  pipeline = new Pipeline({
    recorder: new AudioRecorder(),
    transcribe,
    llmProvider,
    modelPath,
    onStage: (stage) => {
      indicator?.show(stage);
    },
  });
}

function getResourcePath(...segments: string[]): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "resources", ...segments)
    : path.join(__dirname, "../../resources", ...segments);
}

function setupTray(): void {
  const iconPath = getResourcePath("trayIcon.png");
  const icon = nativeImage.createFromPath(iconPath);
  icon.setTemplateImage(true);
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    { label: "Settings", click: () => openSettings() },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() },
  ]);

  tray.setContextMenu(contextMenu);
}

function openSettings(): void {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 540,
    height: 600,
    minWidth: 480,
    minHeight: 500,
    title: "Vox Settings",
    titleBarStyle: "hiddenInset",
    backgroundColor: "#0a0a0a",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  settingsWindow.loadFile(path.join(__dirname, "../../src/renderer/index.html"));

  settingsWindow.on("closed", () => {
    settingsWindow = null;
    // Reload pipeline and re-register shortcuts in case config changed
    setupPipeline();
    if (currentStateMachine) {
      registerShortcutKeys(currentStateMachine);
    }
  });
}

/** Map Electron accelerator key names to UiohookKey keycodes. */
const KEY_TO_UIOHOOK: Record<string, number> = {
  // Modifiers
  Command: UiohookKey.Meta, Cmd: UiohookKey.Meta, Meta: UiohookKey.Meta,
  Ctrl: UiohookKey.Ctrl, Control: UiohookKey.Ctrl,
  Alt: UiohookKey.Alt, Option: UiohookKey.Alt,
  Shift: UiohookKey.Shift,
  // Regular keys
  Space: UiohookKey.Space,
  Enter: UiohookKey.Enter,
  Backspace: UiohookKey.Backspace,
  Tab: UiohookKey.Tab,
  Delete: UiohookKey.Delete,
  Home: UiohookKey.Home,
  End: UiohookKey.End,
  PageUp: UiohookKey.PageUp,
  PageDown: UiohookKey.PageDown,
  Up: UiohookKey.ArrowUp,
  Down: UiohookKey.ArrowDown,
  Left: UiohookKey.ArrowLeft,
  Right: UiohookKey.ArrowRight,
  F1: UiohookKey.F1, F2: UiohookKey.F2, F3: UiohookKey.F3, F4: UiohookKey.F4,
  F5: UiohookKey.F5, F6: UiohookKey.F6, F7: UiohookKey.F7, F8: UiohookKey.F8,
  F9: UiohookKey.F9, F10: UiohookKey.F10, F11: UiohookKey.F11, F12: UiohookKey.F12,
  A: UiohookKey.A, B: UiohookKey.B, C: UiohookKey.C, D: UiohookKey.D,
  E: UiohookKey.E, F: UiohookKey.F, G: UiohookKey.G, H: UiohookKey.H,
  I: UiohookKey.I, J: UiohookKey.J, K: UiohookKey.K, L: UiohookKey.L,
  M: UiohookKey.M, N: UiohookKey.N, O: UiohookKey.O, P: UiohookKey.P,
  Q: UiohookKey.Q, R: UiohookKey.R, S: UiohookKey.S, T: UiohookKey.T,
  U: UiohookKey.U, V: UiohookKey.V, W: UiohookKey.W, X: UiohookKey.X,
  Y: UiohookKey.Y, Z: UiohookKey.Z,
  "0": UiohookKey[0], "1": UiohookKey[1], "2": UiohookKey[2],
  "3": UiohookKey[3], "4": UiohookKey[4], "5": UiohookKey[5],
  "6": UiohookKey[6], "7": UiohookKey[7], "8": UiohookKey[8],
  "9": UiohookKey[9],
  // Punctuation
  "-": UiohookKey.Minus, "=": UiohookKey.Equal,
  "[": UiohookKey.BracketLeft, "]": UiohookKey.BracketRight,
  "\\": UiohookKey.Backslash, ";": UiohookKey.Semicolon,
  "'": UiohookKey.Quote, ",": UiohookKey.Comma,
  ".": UiohookKey.Period, "/": UiohookKey.Slash,
  "`": UiohookKey.Backquote,
};

/** Build the set of all uIOhook keycodes for every key in an accelerator. */
function getHoldKeyCodes(accelerator: string): Set<number> {
  const codes = new Set<number>();
  for (const part of accelerator.split("+")) {
    const code = KEY_TO_UIOHOOK[part];
    if (code !== undefined) codes.add(code);
  }
  return codes;
}

// Set of keycodes for hold mode — releasing ANY of them triggers key-up
let holdKeyCodes: Set<number> = new Set([UiohookKey.Space]);
let currentStateMachine: ShortcutStateMachine | null = null;

function registerShortcutKeys(stateMachine: ShortcutStateMachine): void {
  const config = configManager.load();

  globalShortcut.unregisterAll();

  const holdOk = globalShortcut.register(config.shortcuts.hold, () => {
    stateMachine.handleHoldKeyDown();
  });

  const toggleOk = globalShortcut.register(config.shortcuts.toggle, () => {
    stateMachine.handleTogglePress();
  });

  if (!holdOk) console.warn(`[Vox] Failed to register hold shortcut: ${config.shortcuts.hold}`);
  if (!toggleOk) console.warn(`[Vox] Failed to register toggle shortcut: ${config.shortcuts.toggle}`);

  // Track ALL keys in the hold combo for key-up detection
  holdKeyCodes = getHoldKeyCodes(config.shortcuts.hold);

  console.log(`[Vox] Shortcuts registered: hold=${config.shortcuts.hold}, toggle=${config.shortcuts.toggle}`);
}

function setupShortcuts(): void {
  indicator = new IndicatorWindow();

  const stateMachine = new ShortcutStateMachine({
    onStart: () => {
      console.log("[Vox] Recording started");
      indicator!.show("listening");
      pipeline!.startRecording().catch((err: Error) => {
        console.error("[Vox] Recording failed:", err.message);
        indicator!.hide();
        new Notification({ title: "Vox", body: `Recording failed: ${err.message}` }).show();
      });
    },
    onStop: async () => {
      stateMachine.setProcessing();
      console.log("[Vox] Recording stopped, processing pipeline");
      indicator!.show("transcribing");
      try {
        const text = await pipeline!.stopAndProcess();
        console.log("[Vox] Pipeline complete, text:", text.slice(0, 80));
        if (!text.trim()) {
          indicator!.showError();
        } else {
          indicator!.hide();
          // Wait for the target app to regain focus before pasting
          await new Promise((r) => setTimeout(r, 200));
          pasteText(text);
          new Notification({ title: "Vox", body: text }).show();
        }
      } catch (err: any) {
        console.error("[Vox] Pipeline failed:", err.message);
        indicator!.showError();
      } finally {
        stateMachine.setIdle();
        console.log("[Vox] Ready for next recording");
      }
    },
  });

  currentStateMachine = stateMachine;
  registerShortcutKeys(stateMachine);

  // Detect key-up for hold mode release via native keyboard hook.
  // globalShortcut only fires on key-down; uiohook gives us key-up events.
  // Releasing ANY key in the hold combo triggers stop (the user must hold all keys).
  uIOhook.on("keyup", (e) => {
    if (holdKeyCodes.has(e.keycode)) {
      stateMachine.handleHoldKeyUp();
    }
  });
  uIOhook.start();
}

ipcMain.handle("shortcuts:disable", () => {
  globalShortcut.unregisterAll();
});

ipcMain.handle("shortcuts:enable", () => {
  if (currentStateMachine) {
    registerShortcutKeys(currentStateMachine);
  }
});

app.whenReady().then(async () => {
  // Auto-grant Electron-level media permission for all renderer windows
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === "media");
  });
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    return permission === "media";
  });

  registerIpcHandlers(configManager, modelManager);
  setupPipeline();
  setupTray();
  setupShortcuts();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  uIOhook.stop();
});

app.on("window-all-closed", () => {
  // Do nothing — keep app running as tray app
});
