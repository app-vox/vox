import { app, BrowserWindow, ipcMain, nativeImage, nativeTheme, systemPreferences, shell } from "electron";
import { ConfigManager } from "./config/manager";
import { ModelManager } from "./models/manager";
import { type VoxConfig, type WhisperModelSize } from "../shared/config";
import { getResourcePath } from "./resources";

export function registerIpcHandlers(
  configManager: ConfigManager,
  modelManager: ModelManager,
  onConfigChange?: () => void
): void {
  ipcMain.handle("resources:data-url", (_event, ...segments: string[]) => {
    const filePath = getResourcePath(...segments);
    const image = nativeImage.createFromPath(filePath);
    return image.toDataURL();
  });

  ipcMain.handle("config:load", () => {
    return configManager.load();
  });

  ipcMain.handle("config:save", (_event, config: VoxConfig) => {
    configManager.save(config);
    nativeTheme.themeSource = config.theme;

    // Apply launch at login setting (macOS only)
    if (process.platform === "darwin") {
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
    await modelManager.download(size as WhisperModelSize, (downloaded, total) => {
      _event.sender.send("models:download-progress", { size, downloaded, total });
    });

    // Auto-select the downloaded model
    const config = configManager.load();
    config.whisper.modelSize = size as WhisperModelSize;
    configManager.save(config);
    onConfigChange?.();
  });

  ipcMain.handle("models:cancel-download", (_event, size: string) => {
    modelManager.cancelDownload(size as WhisperModelSize);
  });

  ipcMain.handle("models:delete", (_event, size: string) => {
    modelManager.delete(size as WhisperModelSize);
  });

  ipcMain.handle("llm:test", async () => {
    const { createLlmProvider } = await import("./llm/factory");
    const config = configManager.load();

    // If LLM enhancement is disabled, skip test
    if (!config.enableLlmEnhancement) {
      return { ok: true };
    }

    try {
      const llm = createLlmProvider(config);
      await llm.correct("Hello");
      return { ok: true };
    } catch (err: unknown) {
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

  ipcMain.handle("whisper:test", async (_event, recording: { audioBuffer: number[]; sampleRate: number }) => {
    const { transcribe } = await import("./audio/whisper");
    const config = configManager.load();
    const modelPath = modelManager.getModelPath(config.whisper.model);
    const samples = resampleTo16kHz(new Float32Array(recording.audioBuffer), recording.sampleRate);
    const result = await transcribe(samples, 16000, modelPath);
    return result.text;
  });

  ipcMain.handle("test:transcribe", async (_event, recording: { audioBuffer: number[]; sampleRate: number }) => {
    const { transcribe } = await import("./audio/whisper");
    const { createLlmProvider } = await import("./llm/factory");

    const config = configManager.load();
    const modelPath = modelManager.getModelPath(config.whisper.model);
    const samples = resampleTo16kHz(new Float32Array(recording.audioBuffer), recording.sampleRate);

    const result = await transcribe(samples, 16000, modelPath);
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
}
