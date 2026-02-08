import { app, nativeTheme, session, dialog } from "electron";
import * as path from "path";
import { ConfigManager } from "./config/manager";
import { createSecretStore } from "./config/secrets";
import { ModelManager } from "./models/manager";
import { AudioRecorder } from "./audio/recorder";
import { transcribe } from "./audio/whisper";
import { createLlmProvider } from "./llm/factory";
import { Pipeline } from "./pipeline";
import { ShortcutManager } from "./shortcuts/manager";
import { setupTray } from "./tray";
import { openHome } from "./windows/home";
import { registerIpcHandlers } from "./ipc";

const configDir = path.join(app.getPath("userData"));
const modelsDir = path.join(configDir, "models");
const configManager = new ConfigManager(configDir, createSecretStore());
const modelManager = new ModelManager(modelsDir);

let pipeline: Pipeline | null = null;
let shortcutManager: ShortcutManager | null = null;

function setupPipeline(): void {
  const config = configManager.load();
  const modelPath = modelManager.getModelPath(config.whisper.model);
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

  // Check if ANY model is already downloaded
  const availableSizes = modelManager.getAvailableSizes();
  const hasAnyModel = availableSizes.some(size => modelManager.isModelDownloaded(size));

  // Only auto-download if no models exist
  if (!hasAnyModel) {
    const recommendedModel = initialConfig.whisper.model;
    const modelInfo = modelManager.getModelInfo(recommendedModel);
    const sizeFormatted = (modelInfo.sizeBytes / 1_000_000).toFixed(0);

    const response = await dialog.showMessageBox({
      type: "info",
      title: "Download Whisper Model",
      message: "Vox needs to download a speech recognition model to work.",
      detail: `The recommended model is "${recommendedModel}" (~${sizeFormatted}MB).\n\nThis only happens once. Would you like to download it now?`,
      buttons: ["Download", "Cancel"],
      defaultId: 0,
      cancelId: 1,
    });

    if (response.response === 0) {
      // User clicked "Download"
      console.log(`Downloading recommended model: ${recommendedModel}...`);
      try {
        await modelManager.download(recommendedModel, (downloaded, total) => {
          const percent = ((downloaded / total) * 100).toFixed(1);
          console.log(`Downloading ${recommendedModel}: ${percent}%`);
        });
        console.log(`Model ${recommendedModel} downloaded successfully`);
      } catch (error) {
        console.error(`Failed to download model ${recommendedModel}:`, error);
        await dialog.showErrorBox(
          "Download Failed",
          `Failed to download the Whisper model. You can try again from Settings.\n\nError: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    } else {
      // User clicked "Cancel" - just continue without download
      console.log("User cancelled model download. App will continue without a model.");
    }
  }

  setupPipeline();

  shortcutManager = new ShortcutManager({
    configManager,
    getPipeline: () => pipeline!,
  });
  shortcutManager.start();

  setupTray({
    onOpenHome: () => openHome(reloadConfig),
    onStartListening: () => shortcutManager?.triggerToggle(),
    onStopListening: () => shortcutManager?.stopAndProcess(),
    onCancelListening: () => shortcutManager?.cancelRecording(),
  });

  // Open settings window automatically in dev mode
  if (!app.isPackaged) {
    openHome(reloadConfig);
  }
});

app.on("will-quit", () => {
  shortcutManager?.stop();
});

app.on("window-all-closed", () => {
  // Do nothing — keep app running as tray app
});
