import * as fs from "fs";
import * as path from "path";
import { WHISPER_MODELS, type WhisperModelInfo } from "../../shared/constants";
import { type WhisperModelSize } from "../../shared/config";

export class ModelManager {
  private readonly modelsDir: string;
  private activeDownloads = new Map<string, AbortController>();

  constructor(modelsDir: string) {
    this.modelsDir = modelsDir;
  }

  isModelDownloaded(size: WhisperModelSize): boolean {
    return fs.existsSync(this.getModelPath(size));
  }

  getModelPath(size: WhisperModelSize): string {
    return path.join(this.modelsDir, `ggml-${size}.bin`);
  }

  getAvailableSizes(): WhisperModelSize[] {
    return Object.keys(WHISPER_MODELS) as WhisperModelSize[];
  }

  getModelInfo(size: WhisperModelSize): WhisperModelInfo {
    return WHISPER_MODELS[size];
  }

  cancelDownload(size: WhisperModelSize): void {
    const controller = this.activeDownloads.get(size);
    if (controller) {
      controller.abort();
      this.activeDownloads.delete(size);
    }
  }

  delete(size: WhisperModelSize): void {
    const filePath = this.getModelPath(size);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  async download(
    size: WhisperModelSize,
    onProgress?: (downloaded: number, total: number) => void,
  ): Promise<string> {
    const info = this.getModelInfo(size);
    const destPath = this.getModelPath(size);

    fs.mkdirSync(this.modelsDir, { recursive: true });

    const controller = new AbortController();
    this.activeDownloads.set(size, controller);

    try {
      const response = await fetch(info.url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(
          `Failed to download model: ${response.status} ${response.statusText}`,
        );
      }

      const contentLength = Number(
        response.headers.get("content-length") || info.sizeBytes,
      );
      const reader = response.body!.getReader();
      let downloaded = 0;

      // Stream to file instead of buffering in memory
      const fileHandle = fs.openSync(destPath, "w");
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fs.writeSync(fileHandle, value);
          downloaded += value.length;
          onProgress?.(downloaded, contentLength);
        }
      } finally {
        fs.closeSync(fileHandle);
      }

      return destPath;
    } finally {
      this.activeDownloads.delete(size);
    }
  }
}
