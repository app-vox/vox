import { app, globalShortcut, session, BrowserWindow, Tray, Menu, nativeImage, Notification } from "electron";
import * as path from "path";
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
    title: "Vox Settings",
    resizable: false,
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
    // Reload pipeline in case config changed
    setupPipeline();
  });
}

function setupShortcuts(): void {
  indicator = new IndicatorWindow();

  let stateMachine: ShortcutStateMachine;

  stateMachine = new ShortcutStateMachine({
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
        // Hide indicator and wait for the target app to regain focus before pasting
        indicator!.hide();
        await new Promise((r) => setTimeout(r, 200));
        pasteText(text);
        new Notification({ title: "Vox", body: text || "(empty transcription)" }).show();
      } catch (err: any) {
        console.error("[Vox] Pipeline failed:", err.message);
        indicator!.hide();
        new Notification({ title: "Vox", body: `Failed: ${err.message}` }).show();
      } finally {
        stateMachine.setIdle();
        console.log("[Vox] Ready for next recording");
      }
    },
  });

  // Hold mode: macOS sends repeated key-down events while held.
  // We detect release when the repeats stop (400ms timeout).
  globalShortcut.register("Alt+Space", () => {
    stateMachine.handleHoldKeyRepeat();
  });

  // Toggle mode: press once to start, press again to stop.
  globalShortcut.register("Alt+Shift+Space", () => {
    stateMachine.handleTogglePress();
  });
}

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
});

app.on("window-all-closed", () => {
  // Do nothing — keep app running as tray app
});
