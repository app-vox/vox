import { app, session } from "electron";
import * as path from "path";
import { ConfigManager } from "./config/manager";
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
const configManager = new ConfigManager(configDir);
const modelManager = new ModelManager(modelsDir);

let pipeline: Pipeline | null = null;
let shortcutManager: ShortcutManager | null = null;

function setupPipeline(): void {
  const config = configManager.load();
  const modelPath = modelManager.getModelPath(config.whisper.model);
  const llmProvider = createLlmProvider(config.llm);

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

  registerIpcHandlers(configManager, modelManager);
  setupPipeline();

  shortcutManager = new ShortcutManager({
    configManager,
    getPipeline: () => pipeline!,
  });
  shortcutManager.start();

  setupTray(() => openHome(reloadConfig));
});

app.on("will-quit", () => {
  shortcutManager?.stop();
});

app.on("window-all-closed", () => {
  // Do nothing — keep app running as tray app
});
