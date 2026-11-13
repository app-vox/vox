import { BrowserWindow } from "electron";
import { type ConfigManager } from "./config/manager";
import { type VoxConfig } from "../shared/config";
import { updateTrayConfig } from "./tray";

/**
 * The single write path for the active prompt and for marking the AI connection untested.
 * Every write saves, refreshes the tray and tells open windows to reload the config.
 */
export class PromptSwitch {
  constructor(private readonly configManager: ConfigManager) {}

  /** Makes the prompt with `id` active, or None when `id` is null. */
  setActivePrompt(id: string | null): void {
    const config = this.configManager.load();
    config.activePromptId = id;
    this.saveAndAnnounce(config);
  }

  /** Clears the connection-tested flag and hash, so the enhancement is no longer ready. */
  markConnectionUntested(): void {
    const config = this.configManager.load();
    config.llmConnectionTested = false;
    config.llmConfigHash = "";
    this.saveAndAnnounce(config);
  }

  /** Saves a config sent by a settings window, keeping main's active prompt so a stale copy cannot revert a switch. */
  saveKeepingActivePrompt(config: VoxConfig): void {
    this.configManager.save({ ...config, activePromptId: this.configManager.load().activePromptId });
  }

  private saveAndAnnounce(config: VoxConfig): void {
    this.configManager.save(config);
    updateTrayConfig(config);
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send("config:changed");
    }
  }
}
