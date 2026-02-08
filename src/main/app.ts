import { app, nativeTheme, session } from "electron";
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

  // Ensure the recommended "small" model is downloaded before starting
  const recommendedModel = initialConfig.whisper.model;
  if (!modelManager.isModelDownloaded(recommendedModel)) {
    console.log(`Downloading recommended model: ${recommendedModel}...`);
    try {
      await modelManager.download(recommendedModel, (downloaded, total) => {
        const percent = ((downloaded / total) * 100).toFixed(1);
        console.log(`Downloading ${recommendedModel}: ${percent}%`);
      });
      console.log(`Model ${recommendedModel} downloaded successfully`);
    } catch (error) {
      console.error(`Failed to download model ${recommendedModel}:`, error);
      throw error;
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
