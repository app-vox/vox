import { app, BrowserWindow } from "electron";
import * as fs from "fs";
import * as path from "path";

export interface RecordingResult {
  audioBuffer: Float32Array;
  sampleRate: number;
}

const TARGET_RATE = 16000;

export class AudioRecorder {
  private win: BrowserWindow | null = null;
  private recording = false;

  private async ensureWindow(): Promise<BrowserWindow> {
    if (!this.win || this.win.isDestroyed()) {
      this.win = new BrowserWindow({
        show: false,
        webPreferences: { nodeIntegration: false, contextIsolation: true },
      });

      // Load from a file:// URL so the page has a secure context
      // (navigator.mediaDevices requires a secure origin)
      const htmlPath = path.join(app.getPath("temp"), "vox-recorder.html");
      if (!fs.existsSync(htmlPath)) {
        fs.writeFileSync(htmlPath, "<!DOCTYPE html><html><body></body></html>");
      }
      await this.win.loadFile(htmlPath);
    }
    return this.win;
  }

  async start(): Promise<void> {
    const win = await this.ensureWindow();

    await win.webContents.executeJavaScript(`
      (async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const ctx = new AudioContext({ sampleRate: ${TARGET_RATE} });
        if (ctx.state === "suspended") await ctx.resume();

        const source = ctx.createMediaStreamSource(stream);
        const processor = ctx.createScriptProcessor(4096, 1, 1);
        window._recChunks = [];
        window._recStream = stream;
        window._recCtx = ctx;
        window._recProcessor = processor;

        processor.onaudioprocess = (e) => {
          window._recChunks.push(Array.from(e.inputBuffer.getChannelData(0)));
        };
        source.connect(processor);
        processor.connect(ctx.destination);
      })()
    `);

    this.recording = true;
  }

  async stop(): Promise<RecordingResult> {
    if (!this.recording || !this.win || this.win.isDestroyed()) {
      throw new Error("Recorder not started");
    }

    const result: { audioBuffer: number[]; sampleRate: number } =
      await this.win.webContents.executeJavaScript(`
        (async () => {
          window._recProcessor.disconnect();
          window._recStream.getTracks().forEach(t => t.stop());
          const sampleRate = window._recCtx.sampleRate;
          await window._recCtx.close();

          const totalLength = window._recChunks.reduce((sum, c) => sum + c.length, 0);
          const merged = new Float32Array(totalLength);
          let offset = 0;
          for (const chunk of window._recChunks) {
            merged.set(new Float32Array(chunk), offset);
            offset += chunk.length;
          }

          window._recChunks = null;
          window._recStream = null;
          window._recCtx = null;
          window._recProcessor = null;

          return { audioBuffer: Array.from(merged), sampleRate };
        })()
      `);

    this.recording = false;

    return {
      audioBuffer: new Float32Array(result.audioBuffer),
      sampleRate: result.sampleRate,
    };
  }

  async cancel(): Promise<void> {
    if (!this.recording || !this.win || this.win.isDestroyed()) {
      return;
    }
    try {
      await this.win.webContents.executeJavaScript(`
        (async () => {
          if (window._recProcessor) window._recProcessor.disconnect();
          if (window._recStream) window._recStream.getTracks().forEach(t => t.stop());
          if (window._recCtx) await window._recCtx.close();
          window._recChunks = null;
          window._recStream = null;
          window._recCtx = null;
          window._recProcessor = null;
        })()
      `);
    } catch (err) {
      console.error("[Recorder] Error during cancel:", err);
    }
    this.recording = false;
  }

  dispose(): void {
    if (this.win && !this.win.isDestroyed()) {
      this.win.destroy();
    }
    this.win = null;
    this.recording = false;
  }
}
