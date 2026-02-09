import type { ModelManager } from "../models/manager";
import type { WhisperModelSize } from "../../shared/config";

/**
 * Checks whether Vox has completed initial setup (has at least one Whisper model).
 */
export class SetupChecker {
  constructor(private readonly modelManager: ModelManager) {}

  /**
   * Returns true if at least one Whisper model is downloaded.
   */
  hasAnyModel(): boolean {
    const sizes = this.modelManager.getAvailableSizes();
    return sizes.some(size => this.modelManager.isModelDownloaded(size));
  }

  /**
   * Returns array of downloaded model sizes.
   */
  getDownloadedModels(): WhisperModelSize[] {
    const sizes = this.modelManager.getAvailableSizes();
    return sizes.filter(size => this.modelManager.isModelDownloaded(size));
  }
}
