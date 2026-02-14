import { app, BrowserWindow, nativeTheme, session, dialog, shell } from "electron";
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
import { initAutoUpdater } from "./updater";
import { openHome } from "./windows/home";
import { registerIpcHandlers } from "./ipc";
import { isAccessibilityGranted } from "./input/paster";
import { SetupChecker } from "./setup/checker";
import { HistoryManager } from "./history/manager";
import { type VoxConfig } from "../shared/config";
import { t, setLanguage, resolveSystemLanguage } from "../shared/i18n";

const configDir = path.join(app.getPath("userData"));
const modelsDir = path.join(configDir, "models");
const configManager = new ConfigManager(configDir, createSecretStore());
const modelManager = new ModelManager(modelsDir);
const historyManager = new HistoryManager();

let pipeline: Pipeline | null = null;
let shortcutManager: ShortcutManager | null = null;

function getLlmModelName(config: VoxConfig): string {
  switch (config.llm.provider) {
    case "bedrock": return config.llm.modelId;
    case "openai":
    case "deepseek":
    case "litellm": return config.llm.openaiModel;
    case "foundry":
    default: return config.llm.model;
  }
}

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
    dictionary: config.dictionary ?? [],
    onStage: (stage) => shortcutManager?.showIndicator(stage),
    onComplete: (result) => {
      try {
        historyManager.add({
          ...result,
          wordCount: result.text.split(/\s+/).filter(Boolean).length,
          whisperModel: config.whisper.model || "unknown",
          llmEnhanced: config.enableLlmEnhancement,
          llmProvider: config.enableLlmEnhancement ? config.llm.provider : undefined,
          llmModel: config.enableLlmEnhancement ? getLlmModelName(config) : undefined,
        });
        for (const win of BrowserWindow.getAllWindows()) {
          win.webContents.send("history:entry-added");
        }
      } catch (err) {
        console.error("[Vox] Failed to save transcription to history:", err);
      }
    },
  });
}

function reloadConfig(): void {
  const config = configManager.load();

  const lang = config.language === "system"
    ? resolveSystemLanguage(app.getLocale())
    : config.language;
  setLanguage(lang);

  setupPipeline();
  shortcutManager?.registerShortcutKeys();
  updateTrayConfig(config);

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

  const systemLocale = app.getLocale();
  const lang = initialConfig.language === "system"
    ? resolveSystemLanguage(systemLocale)
    : initialConfig.language;
  setLanguage(lang);

  registerIpcHandlers(configManager, modelManager, historyManager, reloadConfig);

  setupPipeline();
  historyManager.cleanup();

  const hasAccessibility = isAccessibilityGranted();
  if (!hasAccessibility) {
    const response = await dialog.showMessageBox({
      type: "warning",
      title: t("dialog.accessibilityTitle"),
      message: t("dialog.accessibilityMessage"),
      detail: t("dialog.accessibilityDetail"),
      buttons: [t("dialog.openSystemSettings"), t("dialog.continueWithoutShortcuts")],
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
    onOpenHistory: () => openHome(reloadConfig, "transcriptions"),
    onStartListening: () => shortcutManager?.triggerToggle(),
    onStopListening: () => shortcutManager?.stopAndProcess(),
    onCancelListening: () => shortcutManager?.cancelRecording(),
  });
  setTrayModelState(setupChecker.hasAnyModel());
  updateTrayConfig(configManager.load());

  initAutoUpdater(() => updateTrayMenu());

  if (!app.isPackaged || !setupChecker.hasAnyModel()) {
    openHome(reloadConfig);
  }
});

app.on("activate", () => {
  const visibleWindows = BrowserWindow.getAllWindows().filter(win =>
    win.isVisible() && !win.isDestroyed() && win.getTitle() === "Vox"
  );
  if (visibleWindows.length === 0) {
    openHome(reloadConfig);
  }
});

app.on("will-quit", () => {
  shortcutManager?.stop();
});

app.on("window-all-closed", () => {});
