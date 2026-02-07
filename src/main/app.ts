import { app, globalShortcut, systemPreferences, session, BrowserWindow, Tray, Menu, nativeImage, Notification, dialog } from "electron";
import * as path from "path";
import { ConfigManager } from "./config/manager";
import { ModelManager } from "./models/manager";
import { AudioRecorder } from "./audio/recorder";
import { transcribe } from "./audio/whisper";
import { FoundryProvider } from "./llm/foundry";
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

  const llmProvider = new FoundryProvider({
    endpoint: config.llm.endpoint,
    apiKey: config.llm.apiKey,
    model: config.llm.model,
  });

  pipeline = new Pipeline({
    recorder: new AudioRecorder(),
    transcribe,
    llmProvider,
    paste: pasteText,
    modelPath,
    onStage: (stage) => {
      indicator?.show(stage);
    },
  });
}

function setupTray(): void {
  // Load tray icon from resources/ (macOS template image — black with alpha)
  const iconPath = path.join(__dirname, "../../resources/trayIcon.png");
  const icon = nativeImage.createFromPath(iconPath);
  icon.setTemplateImage(true);
  tray = new Tray(icon);
  tray.setTitle("Vox");

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
    width: 500,
    height: 650,
    title: "Vox Settings",
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  settingsWindow.loadFile(path.join(__dirname, "../../src/renderer/index.html"));

  settingsWindow.on("closed", () => {
    settingsWindow = null;
    // Reload pipeline in case config changed
    setupPipeline();
  });
}

function setupShortcuts(): void {
  indicator = new IndicatorWindow();

  const stateMachine = new ShortcutStateMachine({
    onStart: () => {
      indicator!.show("listening");
      pipeline!.startRecording().catch((err: Error) => {
        indicator!.hide();
        new Notification({ title: "Vox", body: `Recording failed: ${err.message}` }).show();
      });
    },
    onStop: () => {
      indicator!.show("transcribing");
      pipeline!.stopAndProcess()
        .then((text) => {
          new Notification({ title: "Vox", body: text || "(empty transcription)" }).show();
        })
        .catch((err: Error) => {
          new Notification({ title: "Vox", body: `Failed: ${err.message}` }).show();
        })
        .finally(() => {
          indicator!.hide();
        });
    },
  });

  // Both shortcuts use toggle mode via Electron's globalShortcut
  // (globalShortcut only detects key-down, not key-up, so hold mode
  // is not possible without a native addon — using toggle for both)
  globalShortcut.register("Alt+Space", () => {
    stateMachine.handleTogglePress();
  });

  globalShortcut.register("Alt+Shift+Space", () => {
    stateMachine.handleTogglePress();
  });
}

app.whenReady().then(async () => {
  // Request microphone permission BEFORE hiding the dock —
  // macOS won't show permission dialogs for background/agent apps
  const micGranted = await systemPreferences.askForMediaAccess("microphone");
  if (!micGranted) {
    new Notification({
      title: "Vox",
      body: "Microphone access denied. Enable it in System Settings > Privacy & Security > Microphone.",
    }).show();
  }

  // Auto-grant Electron-level media permission for all renderer windows
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === "media");
  });
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    return permission === "media";
  });

  // Prompt for Accessibility permission (needed for auto-paste via Cmd+V simulation).
  // The `true` parameter makes macOS show a dialog directing the user to System Settings.
  const accessibilityGranted = systemPreferences.isTrustedAccessibilityClient(true);
  if (!accessibilityGranted) {
    dialog.showMessageBoxSync({
      type: "info",
      title: "Vox — Accessibility Permission",
      message: "Vox needs Accessibility access to auto-paste transcribed text.",
      detail: "A system dialog should have appeared. Grant access to Electron in System Settings > Privacy & Security > Accessibility, then restart Vox.",
    });
  }

  app.dock?.hide();

  registerIpcHandlers(configManager, modelManager);
  setupPipeline();
  setupTray();
  setupShortcuts();

  console.log("[Vox] App ready. Tray and shortcuts active.");
  console.log(`[Vox] Microphone permission: ${micGranted ? "granted" : "denied"}`);
  console.log("[Vox] Press Alt+Space or Alt+Shift+Space to toggle recording.");
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  // Do nothing — keep app running as tray app
});
