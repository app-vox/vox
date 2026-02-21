import { app, BrowserWindow, clipboard, ipcMain, nativeImage, nativeTheme, safeStorage, session, systemPreferences, shell, screen } from "electron";
import * as fs from "fs";
import log from "electron-log/main";
import { ConfigManager } from "./config/manager";
import { ModelManager } from "./models/manager";
import { HistoryManager } from "./history/manager";
import { AnalyticsService } from "./analytics/service";
import { AudioRecorder } from "./audio/recorder";
import { transcribe } from "./audio/whisper";
import { createLlmProvider } from "./llm/factory";
import { computeLlmConfigHash } from "../shared/llm-config-hash";
import { type VoxConfig, type LlmProviderType, type WhisperModelSize } from "../shared/config";
import { getResourcePath } from "./resources";
import { SetupChecker } from "./setup/checker";
import { checkForUpdates, getUpdateState, quitAndInstall } from "./updater";
import { t } from "../shared/i18n";

const testLog = log.scope("LlmTest");

export function registerIpcHandlers(
  configManager: ConfigManager,
  modelManager: ModelManager,
  historyManager: HistoryManager,
  onConfigChange?: () => void,
  analytics?: AnalyticsService
): void {
  ipcMain.handle("resources:data-url", (_event, ...segments: string[]) => {
    const filePath = getResourcePath(...segments);
    if (filePath.endsWith(".svg")) {
      const svg = fs.readFileSync(filePath, "utf-8");
      return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
    }
    const image = nativeImage.createFromPath(filePath);
    return image.toDataURL();
  });

  ipcMain.handle("config:load", () => {
    return configManager.load();
  });

  ipcMain.handle("config:load-llm-for-provider", (_event, provider: LlmProviderType) => {
    return configManager.loadLlmForProvider(provider);
  });

  ipcMain.handle("config:save", (_event, config: VoxConfig) => {
    const previousConfig = configManager.load();
    configManager.save(config);
    nativeTheme.themeSource = config.theme;

    // Track config changes (field names only, never values)
    if (previousConfig.whisper.model !== config.whisper.model) {
      analytics?.track("whisper_model_selected", { model: config.whisper.model });
    }
    if (previousConfig.llm.provider !== config.llm.provider) {
      analytics?.track("llm_provider_selected", { provider: config.llm.provider });
    }
    analytics?.track("config_changed");

    // Apply launch at login setting (macOS only, packaged builds only)
    if (process.platform === "darwin" && app.isPackaged) {
      app.setLoginItemSettings({
        openAtLogin: config.launchAtLogin,
        openAsHidden: false,
      });
    }

    // Reload pipeline to apply new config (especially custom prompt changes)
    onConfigChange?.();
  });

  ipcMain.handle("models:list", () => {
    return modelManager.getAvailableSizes().map((size) => ({
      size,
      info: modelManager.getModelInfo(size),
      downloaded: modelManager.isModelDownloaded(size),
    }));
  });

  ipcMain.handle("models:download", async (_event, size: string) => {
    try {
      await modelManager.download(size as WhisperModelSize, (downloaded, total) => {
        _event.sender.send("models:download-progress", { size, downloaded, total });
      });
      analytics?.track("model_downloaded", { model: size });

      // Auto-select the downloaded model
      const config = configManager.load();
      config.whisper.model = size as WhisperModelSize;
      configManager.save(config);
      onConfigChange?.();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error("Download cancelled");
      }
      analytics?.track("model_download_failed", {
        model: size,
        error_type: err instanceof Error ? err.name : "unknown",
      });
      throw err;
    }
  });

  ipcMain.handle("models:cancel-download", (_event, size: string) => {
    modelManager.cancelDownload(size as WhisperModelSize);
  });

  ipcMain.handle("models:delete", (_event, size: string) => {
    modelManager.delete(size as WhisperModelSize);
  });

  ipcMain.handle("llm:test", async (_event, rendererConfig: VoxConfig) => {
    // Use config sent directly from the renderer to avoid stale disk reads.
    // Force the guard fields so the factory ALWAYS creates a real provider —
    // the dynamic import can drop the `forTest` options bag in bundled builds.
    const config = rendererConfig;
    config.enableLlmEnhancement = true;
    config.llmConnectionTested = true;
    config.llmConfigHash = computeLlmConfigHash(config);

    testLog.warn(">>> TEST START provider=%s", config.llm.provider);

    try {
      // Clear HTTP cache to ensure a fresh network request
      await session.defaultSession.clearCache();
      const llm = createLlmProvider(config);
      testLog.warn(">>> Provider created: %s", llm.constructor.name);

      // Use unique payload each time to defeat any HTTP/proxy caching
      const nonce = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      testLog.warn(">>> Calling llm.correct() nonce=%s", nonce);
      await llm.correct(`Connection test ${nonce}`);
      testLog.warn(">>> llm.correct() OK");

      config.llmConnectionTested = true;
      config.llmConfigHash = computeLlmConfigHash(config);
      configManager.save(config);
      onConfigChange?.();

      return { ok: true };
    } catch (err: unknown) {
      testLog.warn(">>> llm.correct() THREW: %s", err instanceof Error ? err.message : String(err));
      config.llmConnectionTested = false;
      config.llmConfigHash = "";
      configManager.save(config);

      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  function resampleTo16kHz(samples: Float32Array, inputRate: number): Float32Array {
    const targetRate = 16000;
    if (inputRate === targetRate) return samples;
    const ratio = targetRate / inputRate;
    const newLength = Math.round(samples.length * ratio);
    const resampled = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const srcIndex = i / ratio;
      const low = Math.floor(srcIndex);
      const high = Math.min(low + 1, samples.length - 1);
      const frac = srcIndex - low;
      resampled[i] = samples[low] * (1 - frac) + samples[high] * frac;
    }
    return resampled;
  }

  ipcMain.handle("whisper:test", async (_event, durationSec: number) => {
    const config = configManager.load();
    if (!config.whisper.model) {
      throw new Error(t("error.noModel"));
    }
    const modelPath = modelManager.getModelPath(config.whisper.model);

    const recorder = new AudioRecorder();
    try {
      await recorder.start();
      await new Promise((r) => setTimeout(r, durationSec * 1000));
      const recording = await recorder.stop();
      const samples = resampleTo16kHz(recording.audioBuffer, recording.sampleRate);
      const result = await transcribe(samples, 16000, modelPath, config.dictionary ?? []);
      return result.text;
    } finally {
      await recorder.dispose();
    }
  });

  ipcMain.handle("test:transcribe", async (_event, durationSec: number) => {
    const config = configManager.load();
    if (!config.whisper.model) {
      throw new Error(t("error.noModel"));
    }
    const modelPath = modelManager.getModelPath(config.whisper.model);

    const recorder = new AudioRecorder();
    try {
      await recorder.start();
      await new Promise((r) => setTimeout(r, durationSec * 1000));
      const recording = await recorder.stop();
      const samples = resampleTo16kHz(recording.audioBuffer, recording.sampleRate);
      const result = await transcribe(samples, 16000, modelPath, config.dictionary ?? []);
      const rawText = result.text;

      let correctedText: string | null = null;
      let llmError: string | null = null;
      try {
        const llm = createLlmProvider(config);
        correctedText = await llm.correct(rawText);
      } catch (err: unknown) {
        llmError = err instanceof Error ? err.message : String(err);
      }

      return { rawText, correctedText, llmError };
    } finally {
      await recorder.dispose();
    }
  });

  ipcMain.handle("permissions:status", () => {
    // Use only native AXIsProcessTrusted via koffi — avoid Electron's
    // isTrustedAccessibilityClient which can interfere with TCC on Sequoia.
    let accessibility: boolean | string = false;
    try {
      const koffi = require("koffi");
      const appServices = koffi.load("/System/Library/Frameworks/ApplicationServices.framework/ApplicationServices");
      const AXIsProcessTrusted = appServices.func("AXIsProcessTrusted", "bool", []);
      accessibility = AXIsProcessTrusted();
    } catch (err: unknown) {
      accessibility = `error: ${err instanceof Error ? err.message : String(err)}`;
    }

    return {
      microphone: systemPreferences.getMediaAccessStatus("microphone"),
      accessibility,
      pid: process.pid,
      execPath: process.execPath,
      bundleId: app.name,
    };
  });

  ipcMain.handle("permissions:keychain-status", () => {
    return {
      available: safeStorage.isEncryptionAvailable(),
      encryptedCount: configManager.countEncryptedSecrets(),
    };
  });

  ipcMain.handle("permissions:request-microphone", async () => {
    app.focus({ steal: true });
    const granted = await systemPreferences.askForMediaAccess("microphone");
    return granted;
  });

  ipcMain.handle("permissions:request-accessibility", () => {
    // Don't call isTrustedAccessibilityClient(true) — on Sequoia it can
    // register the app incorrectly causing the toggle to bounce back.
    // Instead, just open System Settings and let the user add the app via "+".
    shell.openExternal("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility");
  });

  ipcMain.handle("theme:system-dark", () => {
    return nativeTheme.shouldUseDarkColors;
  });

  nativeTheme.on("updated", () => {
    const isDark = nativeTheme.shouldUseDarkColors;
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send("theme:system-changed", isDark);
    }
  });

  ipcMain.handle("permissions:test-paste", () => {
    const { pasteText } = require("./input/paster");

    // Check native accessibility status
    let hasAccessibility = false;
    try {
      const koffi = require("koffi");
      const as = koffi.load("/System/Library/Frameworks/ApplicationServices.framework/ApplicationServices");
      hasAccessibility = as.func("AXIsProcessTrusted", "bool", [])();
    } catch { /* ignore */ }

    try {
      pasteText("Vox paste test");
      return {
        ok: true,
        hasAccessibility,
        mode: hasAccessibility ? "auto-paste" : "clipboard-only",
      };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : String(err), hasAccessibility };
    }
  });

  ipcMain.handle("shell:open-external", async (_event, url: string) => {
    await shell.openExternal(url);
  });

  ipcMain.handle("displays:get-all", () => {
    return screen.getAllDisplays().map((d) => ({
      id: d.id,
      label: d.label || `Display ${d.id}`,
      bounds: d.bounds,
      primary: d.id === screen.getPrimaryDisplay().id,
    }));
  });

  // Setup state check
  const setupChecker = new SetupChecker(modelManager);

  ipcMain.handle("setup:check", () => {
    return {
      hasAnyModel: setupChecker.hasAnyModel(),
      downloadedModels: setupChecker.getDownloadedModels(),
    };
  });

  // Update checks
  ipcMain.handle("updates:check", () => checkForUpdates());
  ipcMain.handle("updates:get-state", () => getUpdateState());
  ipcMain.handle("updates:get-version", () => app.getVersion());
  ipcMain.handle("updates:quit-and-install", () => quitAndInstall());

  // History
  ipcMain.handle("history:get", (_event, params: { offset: number; limit: number }) => {
    return historyManager.get(params.offset, params.limit);
  });

  ipcMain.handle("history:search", (_event, params: { query: string; offset: number; limit: number }) => {
    return historyManager.search(params.query, params.offset, params.limit);
  });

  ipcMain.handle("history:clear", () => {
    historyManager.clear();
  });

  ipcMain.handle("history:delete-entry", (_event, id: string) => {
    historyManager.deleteEntry(id);
  });

  ipcMain.handle("history:add", (_event, entry: { text: string; originalText: string; audioDurationMs: number; whisperModel: string; llmEnhanced: boolean }) => {
    historyManager.add({
      ...entry,
      wordCount: entry.text.split(/\s+/).filter(Boolean).length,
    });
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send("history:entry-added");
    }
  });

  ipcMain.handle("clipboard:write", (_event, text: string) => {
    clipboard.writeText(text);
  });

  ipcMain.handle("i18n:system-locale", () => {
    return app.getLocale();
  });

  ipcMain.handle("analytics:track", (_event, name: string, properties?: Record<string, unknown>) => {
    analytics?.track(name, properties);
  });
}
