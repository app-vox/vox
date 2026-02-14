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
  private levelsInterval: ReturnType<typeof setInterval> | null = null;
  onAudioLevels: ((levels: number[]) => void) | null = null;

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

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.6;
        source.connect(analyser);
        window._recAnalyser = analyser;

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

    // Start audio level polling for waveform visualization
    this.levelsInterval = setInterval(async () => {
      if (!this.recording || !this.win || this.win.isDestroyed()) {
        this.stopLevels();
        return;
      }
      try {
        const levels: number[] = await this.win.webContents.executeJavaScript(`
          (() => {
            if (!window._recAnalyser) return [0,0,0,0,0,0,0];
            const data = new Uint8Array(window._recAnalyser.frequencyBinCount);
            window._recAnalyser.getByteFrequencyData(data);
            const binCount = data.length;
            const bandSize = Math.floor(binCount / 7);
            const levels = [];
            for (let i = 0; i < 7; i++) {
              let sum = 0;
              const start = i * bandSize;
              const end = Math.min(start + bandSize, binCount);
              for (let j = start; j < end; j++) sum += data[j];
              levels.push(sum / ((end - start) * 255));
            }
            return levels;
          })()
        `);
        this.onAudioLevels?.(levels);
      } catch {
        // Window may have been destroyed
      }
    }, 33);
  }

  async stop(): Promise<RecordingResult> {
    this.stopLevels();
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
          window._recAnalyser = null;

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
    this.stopLevels();
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
          window._recAnalyser = null;
        })()
      `);
    } catch (err) {
      console.error("[Recorder] Error during cancel:", err);
    }
    this.recording = false;
  }

  async playAudioCue(samples: number[]): Promise<void> {
    if (samples.length === 0) return;
    if (!this.win || this.win.isDestroyed()) return;

    await this.win.webContents.executeJavaScript(`
      (() => {
        const samples = new Float32Array(${JSON.stringify(Array.from(samples))});
        const ctx = new AudioContext();
        const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
        buffer.getChannelData(0).set(samples.length <= buffer.length
          ? samples
          : samples.slice(0, buffer.length));
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start();
        source.onended = () => ctx.close();
      })()
    `);
  }

  private stopLevels(): void {
    if (this.levelsInterval) {
      clearInterval(this.levelsInterval);
      this.levelsInterval = null;
    }
  }

  dispose(): void {
    this.stopLevels();
    if (this.win && !this.win.isDestroyed()) {
      this.win.destroy();
    }
    this.win = null;
    this.recording = false;
  }
}
