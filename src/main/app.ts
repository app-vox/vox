import { app, nativeTheme, session, dialog, shell } from "electron";
import * as path from "path";
import { ConfigManager } from "./config/manager";
import { createSecretStore } from "./config/secrets";
import { ModelManager } from "./models/manager";
import { AudioRecorder } from "./audio/recorder";
import { transcribe } from "./audio/whisper";
import { createLlmProvider } from "./llm/factory";
import { Pipeline } from "./pipeline";
import { ShortcutManager } from "./shortcuts/manager";
import { setupTray, setTrayModelState, updateTrayConfig, updateTrayMenu } from "./tray";
import { checkForUpdates } from "./updater";
import { openHome } from "./windows/home";
import { registerIpcHandlers } from "./ipc";
import { isAccessibilityGranted } from "./input/paster";
import { SetupChecker } from "./setup/checker";

const configDir = path.join(app.getPath("userData"));
const modelsDir = path.join(configDir, "models");
const configManager = new ConfigManager(configDir, createSecretStore());
const modelManager = new ModelManager(modelsDir);

let pipeline: Pipeline | null = null;
let shortcutManager: ShortcutManager | null = null;

function setupPipeline(): void {
  const config = configManager.load();
  const modelPath = config.whisper.model
    ? modelManager.getModelPath(config.whisper.model)
    : "";
  const llmProvider = createLlmProvider(config);

  pipeline = new Pipeline({
    recorder: new AudioRecorder(),
    transcribe,
    llmProvider,
    modelPath,
    onStage: (stage) => shortcutManager?.showIndicator(stage),
  });
}

function reloadConfig(): void {
  setupPipeline();
  shortcutManager?.registerShortcutKeys();
  updateTrayConfig(configManager.load());

  const setupChecker = new SetupChecker(modelManager);
  setTrayModelState(setupChecker.hasAnyModel());
}

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === "media");
  });
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    return permission === "media";
  });

  const initialConfig = configManager.load();
  nativeTheme.themeSource = initialConfig.theme;

  registerIpcHandlers(configManager, modelManager, reloadConfig);

  setupPipeline();

  const hasAccessibility = isAccessibilityGranted();
  if (!hasAccessibility) {
    const response = await dialog.showMessageBox({
      type: "warning",
      title: "Accessibility Permission Required",
      message: "Vox needs Accessibility permission to use keyboard shortcuts",
      detail: "Vox uses global keyboard shortcuts (like Alt+Space) to activate voice recording.\n\nTo enable this feature:\n\n1. Click \"Open System Settings\" below\n2. Find and enable \"Electron\" or \"Vox\" in the Accessibility list\n3. Restart Vox\n\nWithout this permission, you can still use Vox from the menu bar, but keyboard shortcuts won't work.",
      buttons: ["Open System Settings", "Continue Without Shortcuts"],
      defaultId: 0,
      cancelId: 1,
    });

    if (response.response === 0) {
      shell.openExternal("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility");
      console.log("[Vox] Opening Accessibility settings...");
    } else {
      console.log("[Vox] User chose to continue without Accessibility permission");
    }
  }

  shortcutManager = new ShortcutManager({
    configManager,
    getPipeline: () => pipeline!,
  });
  shortcutManager.start();

  const setupChecker = new SetupChecker(modelManager);
  setupTray({
    onOpenHome: () => openHome(reloadConfig),
    onStartListening: () => shortcutManager?.triggerToggle(),
    onStopListening: () => shortcutManager?.stopAndProcess(),
    onCancelListening: () => shortcutManager?.cancelRecording(),
  });
  setTrayModelState(setupChecker.hasAnyModel());
  updateTrayConfig(configManager.load());

  // Check for updates on startup (respects 24h cooldown)
  checkForUpdates().then(() => updateTrayMenu());

  if (!app.isPackaged) {
    openHome(reloadConfig);
  }
});

app.on("will-quit", () => {
  shortcutManager?.stop();
});

app.on("window-all-closed", () => {
  // Keep app running as tray app
});
