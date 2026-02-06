import { BrowserWindow } from "electron";

export interface RecordingResult {
  audioBuffer: Float32Array;
  sampleRate: number;
}

export class AudioRecorder {
  private recorderWindow: BrowserWindow | null = null;

  async start(): Promise<void> {
    this.recorderWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    await this.recorderWindow.loadURL("about:blank");

    await this.recorderWindow.webContents.executeJavaScript(`
      (async () => {
        window.__voxStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        window.__voxContext = new AudioContext({ sampleRate: 16000 });
        const source = window.__voxContext.createMediaStreamSource(window.__voxStream);
        window.__voxProcessor = window.__voxContext.createScriptProcessor(4096, 1, 1);
        window.__voxChunks = [];
        window.__voxProcessor.onaudioprocess = (e) => {
          window.__voxChunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
        };
        source.connect(window.__voxProcessor);
        window.__voxProcessor.connect(window.__voxContext.destination);
      })()
    `);
  }

  async stop(): Promise<RecordingResult> {
    if (!this.recorderWindow) {
      throw new Error("Recorder not started");
    }

    const result = await this.recorderWindow.webContents.executeJavaScript(`
      (() => {
        window.__voxProcessor.disconnect();
        window.__voxStream.getTracks().forEach(t => t.stop());

        const totalLength = window.__voxChunks.reduce((sum, c) => sum + c.length, 0);
        const merged = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of window.__voxChunks) {
          merged.set(chunk, offset);
          offset += chunk.length;
        }

        return {
          audioBuffer: Array.from(merged),
          sampleRate: window.__voxContext.sampleRate,
        };
      })()
    `);

    this.recorderWindow.close();
    this.recorderWindow = null;

    return {
      audioBuffer: new Float32Array(result.audioBuffer),
      sampleRate: result.sampleRate,
    };
  }
}
