import { app } from "electron";
import { execFile } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { buildWhisperPrompt, buildWhisperArgs } from "../../shared/constants";

export interface TranscriptionResult {
  text: string;
}

// In packaged builds, app.getAppPath() points inside app.asar but native
// binaries are in app.asar.unpacked. Replace accordingly for the binary path.
const appRoot = app.getAppPath().replace("app.asar", "app.asar.unpacked");
const WHISPER_CPP_DIR = path.join(appRoot, "node_modules/whisper-node/lib/whisper.cpp");
const WHISPER_BIN = path.join(WHISPER_CPP_DIR, "main");

export async function transcribe(
  audioBuffer: Float32Array,
  sampleRate: number,
  modelPath: string,
  dictionary: string[] = [],
  speechLanguages: string[] = []
): Promise<TranscriptionResult> {
  const tempPath = path.join(os.tmpdir(), `vox-recording-${Date.now()}.wav`);

  try {
    const wavBuffer = encodeWav(audioBuffer, sampleRate);
    fs.writeFileSync(tempPath, wavBuffer);

    const whisperArgs = buildWhisperArgs(speechLanguages);
    const prompt = buildWhisperPrompt(dictionary, whisperArgs.promptPrefix);
    const stdout = await runWhisper(modelPath, tempPath, prompt, whisperArgs.language);
    const text = parseWhisperOutput(stdout);

    return { text };
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
}

function runWhisper(modelPath: string, filePath: string, prompt: string, language = "auto"): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      WHISPER_BIN,
      [
        "-l", language,
        "-m", modelPath,
        "-f", filePath,
        "--best-of", "5",         // Greedy default (whisper.cpp max decoders = 8)
        "--beam-size", "5",       // Enable beam search (greedy is the CLI default)
        "--entropy-thold", "2.0", // Lower threshold = more conservative (default: 2.4)
        "--prompt", prompt,
      ],
      { cwd: WHISPER_CPP_DIR, timeout: 30000 },
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

function encodeWav(samples: Float32Array, sampleRate: number): Buffer {
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
