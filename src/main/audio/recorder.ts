import { type ChildProcess, spawn } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export interface RecordingResult {
  audioBuffer: Float32Array;
  sampleRate: number;
}

const TARGET_RATE = 16000;

export class AudioRecorder {
  private process: ChildProcess | null = null;
  private tempPath: string | null = null;

  async start(): Promise<void> {
    this.tempPath = path.join(os.tmpdir(), `vox-recording-${Date.now()}.wav`);

    // Use sox 'rec' to capture 16kHz mono 16-bit WAV directly
    this.process = spawn("rec", [
      "-r", String(TARGET_RATE),
      "-c", "1",
      "-b", "16",
      this.tempPath,
    ], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Wait briefly for sox to initialize
    await new Promise<void>((resolve, reject) => {
      const onError = (err: Error) => {
        cleanup();
        reject(new Error(`Failed to start recording: ${err.message}`));
      };
      const onSpawn = () => {
        cleanup();
        resolve();
      };
      const cleanup = () => {
        this.process?.removeListener("error", onError);
        this.process?.removeListener("spawn", onSpawn);
      };
      this.process!.on("error", onError);
      this.process!.on("spawn", onSpawn);
    });
  }

  async stop(): Promise<RecordingResult> {
    if (!this.process || !this.tempPath) {
      throw new Error("Recorder not started");
    }

    const proc = this.process;
    const filePath = this.tempPath;
    this.process = null;
    this.tempPath = null;

    // SIGINT makes sox finalize the WAV header properly
    proc.kill("SIGINT");

    await new Promise<void>((resolve) => {
      proc.on("close", () => resolve());
    });

    const wavBuffer = fs.readFileSync(filePath);
    fs.unlinkSync(filePath);

    // WAV header is 44 bytes, data is 16-bit signed PCM
    const dataOffset = 44;
    const numSamples = (wavBuffer.length - dataOffset) / 2;
    const audioBuffer = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const int16 = wavBuffer.readInt16LE(dataOffset + i * 2);
      audioBuffer[i] = int16 / (int16 < 0 ? 0x8000 : 0x7fff);
    }

    return { audioBuffer, sampleRate: TARGET_RATE };
  }
}
