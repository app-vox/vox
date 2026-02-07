import { ipcMain } from "electron";
import { ConfigManager } from "./config/manager";
import { ModelManager } from "./models/manager";
import { type VoxConfig } from "../shared/config";

export function registerIpcHandlers(
  configManager: ConfigManager,
  modelManager: ModelManager
): void {
  ipcMain.handle("config:load", () => {
    return configManager.load();
  });

  ipcMain.handle("config:save", (_event, config: VoxConfig) => {
    configManager.save(config);
  });

  ipcMain.handle("models:list", () => {
    return modelManager.getAvailableSizes().map((size) => ({
      size,
      info: modelManager.getModelInfo(size),
      downloaded: modelManager.isModelDownloaded(size),
    }));
  });

  ipcMain.handle("models:download", async (_event, size: string) => {
    await modelManager.download(size as any, (downloaded, total) => {
      _event.sender.send("models:download-progress", { size, downloaded, total });
    });
  });

  ipcMain.handle("test:transcribe", async (_event, recording: { audioBuffer: number[]; sampleRate: number }) => {
    const { transcribe } = await import("./audio/whisper");
    const { FoundryProvider } = await import("./llm/foundry");

    const config = configManager.load();
    const modelPath = modelManager.getModelPath(config.whisper.model);

    let samples = new Float32Array(recording.audioBuffer);
    const inputRate = recording.sampleRate;

    // Resample to 16kHz if needed — Whisper expects 16kHz mono audio
    const targetRate = 16000;
    if (inputRate !== targetRate) {
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
      samples = resampled;
    }

    const result = await transcribe(samples, targetRate, modelPath);
    const rawText = result.text;

    let correctedText: string | null = null;
    let llmError: string | null = null;
    if (config.llm.endpoint && config.llm.apiKey) {
      try {
        const llm = new FoundryProvider({
          endpoint: config.llm.endpoint,
          apiKey: config.llm.apiKey,
          model: config.llm.model,
        });
        correctedText = await llm.correct(rawText);
      } catch (err: any) {
        llmError = err.message || String(err);
      }
    } else {
      llmError = "No endpoint or API key configured";
    }

    return { rawText, correctedText, llmError };
  });
}
