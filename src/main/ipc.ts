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
}
