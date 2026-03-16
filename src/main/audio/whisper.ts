import { app } from "electron";
import { execFile } from "child_process";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { buildWhisperPrompt, buildWhisperArgs } from "../../shared/constants";
import { whisper as whisperConfig } from "../platform";

export interface TranscriptionResult {
  text: string;
}

// In packaged builds, native binaries are copied to extraResources via
// electron-builder. In dev, they live in the project root.
const WHISPER_BIN = app.isPackaged
  ? path.join(process.resourcesPath, "vendor/whisper.cpp", whisperConfig.binaryName)
  : path.join(app.getAppPath(), "vendor/whisper.cpp", whisperConfig.binaryName);

export async function transcribe(
  audioBuffer: Float32Array,
  sampleRate: number,
  modelPath: string,
  dictionary: string[] = [],
  speechLanguages: string[] = [],
  temperature?: number
): Promise<TranscriptionResult> {
  const tempPath = path.join(os.tmpdir(), `vox-recording-${crypto.randomUUID()}.wav`);

  try {
    const normalized = normalizeAudio(audioBuffer);
    const wavBuffer = encodeWav(normalized, sampleRate);
    fs.writeFileSync(tempPath, wavBuffer);

    const whisperArgs = buildWhisperArgs(speechLanguages);
    const prompt = buildWhisperPrompt(dictionary, whisperArgs.promptPrefix);
    const language = whisperConfig.resolveLanguage(whisperArgs.language, speechLanguages);

    const stdout = await runWhisperCli(modelPath, tempPath, prompt, language, temperature);
    const text = parseWhisperOutput(stdout);

    return { text };
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
}

function runWhisperCli(modelPath: string, filePath: string, prompt: string, language = "auto", temperature?: number): Promise<string> {
  const args = [
    "-t", String(whisperConfig.threads),
    "-l", language,
    "-m", modelPath,
    "-f", filePath,
    "--entropy-thold", "2.0",
    "--prompt", prompt,
  ];
  if (temperature !== undefined) {
    args.push("--temperature", String(temperature));
  }
  return new Promise((resolve, reject) => {
    execFile(
      WHISPER_BIN,
      args,
      { timeout: whisperConfig.timeout },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Whisper failed: ${stderr || error.message}`));
          return;
        }
        // whisper.cpp writes transcription to stderr, plain text to stdout
        resolve(stderr + "\n" + stdout);
      }
    );
  });
}

function parseWhisperOutput(output: string): string {
  // Match lines like: [00:00:00.000 --> 00:00:03.000]   Testando para ver se funciona
  const lines = output.match(/\[\d{2}:\d{2}:\d{2}\.\d{3}\s-->\s\d{2}:\d{2}:\d{2}\.\d{3}\]\s+.+/g);
  if (!lines) return "";

  return lines
    .map((line) => {
      const match = line.match(/\]\s+(.+)/);
      return match ? match[1].trim() : "";
    })
    .filter(Boolean)
    .join(" ")
    .trim();
}

// Scale audio so peak amplitude reaches the target, preventing Whisper
// hallucinations on quiet input. Skips silence-only buffers.
export const NORM_TARGET = 0.89; // ≈ -1 dB

export function normalizeAudio(samples: Float32Array): Float32Array {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > peak) peak = abs;
  }

  if (peak < 1e-6 || peak >= NORM_TARGET) return samples;

  const gain = NORM_TARGET / peak;
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    out[i] = samples[i] * gain;
  }
  return out;
}

export function encodeWav(samples: Float32Array, sampleRate: number): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = samples.length * (bitsPerSample / 8);
  const headerSize = 44;

  const buffer = Buffer.alloc(headerSize + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);

  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    buffer.writeInt16LE(Math.round(int16), headerSize + i * 2);
  }

  return buffer;
}
