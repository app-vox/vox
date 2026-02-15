import { app, BrowserWindow, ipcMain, nativeTheme, session, dialog, shell } from "electron";
import * as path from "path";
import { readFileSync } from "fs";
import { join } from "path";
import { ConfigManager } from "./config/manager";
import { createSecretStore } from "./config/secrets";
import { ModelManager } from "./models/manager";
import { AudioRecorder } from "./audio/recorder";
import { transcribe } from "./audio/whisper";
import { createLlmProvider } from "./llm/factory";
import { Pipeline } from "./pipeline";
import { ShortcutManager } from "./shortcuts/manager";
import { setupTray, setTrayModelState, updateTrayConfig, updateTrayMenu, getTrayState } from "./tray";
import { initAutoUpdater } from "./updater";
import { openHome } from "./windows/home";
import { registerIpcHandlers } from "./ipc";
import { isAccessibilityGranted } from "./input/paster";
import { SetupChecker } from "./setup/checker";
import { HistoryManager } from "./history/manager";
import { type AudioCueType } from "../shared/config";
import { generateCueSamples, isWavCue, getWavFilename, parseWavSamples } from "../shared/audio-cue";
import { t, setLanguage, resolveSystemLanguage } from "../shared/i18n";
import { getLlmModelName } from "../shared/llm-utils";
import { AnalyticsService } from "./analytics/service";
import { setupAnalyticsErrorCapture } from "./logger";
import log from "./logger";

log.initialize();
const slog = log.scope("Vox");

const configDir = path.join(app.getPath("userData"));
const modelsDir = path.join(configDir, "models");
const configManager = new ConfigManager(configDir, createSecretStore());
const modelManager = new ModelManager(modelsDir);
const historyManager = new HistoryManager();
const analytics = new AnalyticsService();

let pipeline: Pipeline | null = null;
let shortcutManager: ShortcutManager | null = null;

function setupPipeline(): void {
  const config = configManager.load();
  const modelPath = config.whisper.model
    ? modelManager.getModelPath(config.whisper.model)
    : "";
  const llmProvider = createLlmProvider(config);

  const recorder = new AudioRecorder();
  recorder.onAudioLevels = (levels) => {
    shortcutManager?.sendAudioLevels(levels);
  };

  pipeline = new Pipeline({
    recorder,
    transcribe,
    llmProvider,
    modelPath,
    dictionary: config.dictionary ?? [],
    hasCustomPrompt: Boolean(config.customPrompt),
    llmModelName: config.enableLlmEnhancement ? getLlmModelName(config.llm) : undefined,
    analytics,
    onStage: (stage) => {
      shortcutManager?.showIndicator(stage);
      if (stage === "enhancing") {
        shortcutManager?.getHud().setState("enhancing");
      }
    },
    onComplete: (result) => {
      try {
        historyManager.add({
          ...result,
          wordCount: result.text.split(/\s+/).filter(Boolean).length,
          whisperModel: config.whisper.model || "unknown",
          llmEnhanced: config.enableLlmEnhancement,
          llmProvider: config.enableLlmEnhancement ? config.llm.provider : undefined,
          llmModel: config.enableLlmEnhancement ? getLlmModelName(config.llm) : undefined,
        });
        for (const win of BrowserWindow.getAllWindows()) {
          win.webContents.send("history:entry-added");
        }
      } catch (err) {
        slog.error("Failed to save transcription to history", err);
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
  shortcutManager?.updateHud();
  updateTrayConfig(config);
  analytics.setEnabled(config.analyticsEnabled);

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

  analytics.init({
    enabled: initialConfig.analyticsEnabled,
    locale: lang,
  });
  analytics.identify();
  setupAnalyticsErrorCapture(analytics);
  analytics.track("app_launched", {
    launch_at_login: initialConfig.launchAtLogin,
  });

  registerIpcHandlers(configManager, modelManager, historyManager, reloadConfig, analytics);

  ipcMain.handle("audio:preview-cue", async (_event, cueType: string) => {
    if (cueType === "none" || !pipeline) return;
    const cue = cueType as AudioCueType;
    if (isWavCue(cue)) {
      const filename = getWavFilename(cue);
      if (!filename) return;
      const audioDir = app.isPackaged
        ? join(process.resourcesPath, "resources", "audio")
        : join(app.getAppPath(), "resources", "audio");
      const wavData = readFileSync(join(audioDir, filename));
      const parsed = parseWavSamples(wavData);
      if (parsed.samples.length > 0) await pipeline.playAudioCue(parsed.samples, parsed.sampleRate);
    } else {
      const samples = generateCueSamples(cue, 44100);
      if (samples.length > 0) await pipeline.playAudioCue(samples);
    }
  });

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
      slog.info("Opening Accessibility settings");
    } else {
      slog.info("User chose to continue without Accessibility permission");
    }
  }

  shortcutManager = new ShortcutManager({
    configManager,
    getPipeline: () => pipeline!,
    analytics,
  });
  shortcutManager.start();

  ipcMain.handle("dev:get-runtime-state", () => {
    return {
      shortcutState: shortcutManager?.getStateMachineState() ?? "idle",
      isRecording: shortcutManager?.isRecording() ?? false,
      indicatorVisible: shortcutManager?.getIndicator().isVisible() ?? false,
      indicatorMode: shortcutManager?.getIndicator().getMode(),
      hudVisible: shortcutManager?.getHud().isVisible() ?? false,
      ...getTrayState(),
    };
  });

  ipcMain.handle("dev:set-analytics-enabled", (_event, enabled: boolean) => {
    analytics.setEnabled(enabled);
    return enabled;
  });

  ipcMain.handle("dev:get-system-info", () => {
    return {
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      chromeVersion: process.versions.chrome,
      v8Version: process.versions.v8,
      platform: process.platform,
      arch: process.arch,
      isPackaged: app.isPackaged,
      appVersion: app.getVersion(),
      appPath: app.getAppPath(),
      userDataPath: app.getPath("userData"),
      logsPath: app.getPath("logs"),
      logLevelFile: String(log.transports.file.level),
      logLevelConsole: String(log.transports.console.level),
      whisperLib: "whisper-node (whisper.cpp)",
    };
  });

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

  shortcutManager.updateHud();
  openHome(reloadConfig);
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
  analytics.track("app_quit", {
    session_duration_ms: Math.round(performance.now()),
  });
  analytics.shutdown();
  shortcutManager?.stop();
});

app.on("window-all-closed", () => {});

let quitting = false;
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
  process.on(sig, () => {
    if (quitting) process.exit(0);
    quitting = true;
    shortcutManager?.stop();
    app.quit();
    setTimeout(() => process.exit(0), 2000).unref();
  });
}
