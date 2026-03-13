import { app } from "electron";
import * as fs from "fs";
import * as path from "path";
import { Worker } from "worker_threads";
import log from "electron-log/main";
import { encodeWav, normalizeAudio } from "./whisper";
import type { RecordingResult } from "./recorder";

// Keep in sync with NORM_TARGET in whisper.ts
const NORM_TARGET = 0.89;

const slog = log.scope("AudioPersistence");

export function getAudioDir(): string {
  return path.join(app.getPath("userData"), "audio");
}

export function getAudioFilePath(entryId: string): string {
  return path.join(getAudioDir(), `${entryId}.wav`);
}

export async function saveAudioFile(
  audioBuffer: Float32Array,
  sampleRate: number,
  entryId: string,
): Promise<string> {
  const dir = getAudioDir();
  await fs.promises.mkdir(dir, { recursive: true });

  const filePath = getAudioFilePath(entryId);
  const normalized = normalizeAudio(audioBuffer);
  const wavBuffer = encodeWav(normalized, sampleRate);
  await fs.promises.writeFile(filePath, wavBuffer);

  slog.info("Audio saved", { filePath, samples: audioBuffer.length, sampleRate });
  return filePath;
}

/**
 * Encode and save audio in a dedicated Worker Thread so the main V8 heap
 * is never stressed by the encoding allocations. The sample buffer is sliced
 * and transferred (zero-copy) to the worker, which runs normalize+encode+write
 * in its own isolated heap — completely decoupled from the main process heap.
 */
export function saveAudioFileInWorker(
  audioBuffer: Float32Array,
  sampleRate: number,
  entryId: string,
): void {
  const filePath = getAudioFilePath(entryId);
  const dir = getAudioDir();

  // slice() gives us an independent ArrayBuffer for transfer without neutering
  // the original buffer still held by the Pipeline's heldRecording.
  const transferable = audioBuffer.buffer.slice(
    audioBuffer.byteOffset,
    audioBuffer.byteOffset + audioBuffer.byteLength,
  );

  // All encoding logic is inlined — the eval worker can only use built-in modules.
  const code = `
    'use strict';
    const { workerData, parentPort } = require('worker_threads');
    const fs = require('fs');
    const { sampleBuf, sampleRate, dir, filePath, normTarget } = workerData;
    const samples = new Float32Array(sampleBuf);
    let peak = 0;
    for (let i = 0; i < samples.length; i++) {
      const abs = Math.abs(samples[i]);
      if (abs > peak) peak = abs;
    }
    const gain = (peak < 1e-6 || peak >= normTarget) ? 1.0 : normTarget / peak;
    const numSamples = samples.length;
    const wav = Buffer.alloc(44 + numSamples * 2);
    wav.write('RIFF', 0);
    wav.writeUInt32LE(36 + numSamples * 2, 4);
    wav.write('WAVE', 8);
    wav.write('fmt ', 12);
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(sampleRate, 24);
    wav.writeUInt32LE(sampleRate * 2, 28);
    wav.writeUInt16LE(2, 32);
    wav.writeUInt16LE(16, 34);
    wav.write('data', 36);
    wav.writeUInt32LE(numSamples * 2, 40);
    for (let i = 0; i < numSamples; i++) {
      const s = Math.max(-1, Math.min(1, samples[i] * gain));
      wav.writeInt16LE(Math.round(s < 0 ? s * 32768 : s * 32767), 44 + i * 2);
    }
    fs.promises.mkdir(dir, { recursive: true })
      .then(() => fs.promises.writeFile(filePath, wav))
      .then(() => parentPort.postMessage('done'))
      .catch(err => parentPort.postMessage({ error: String(err) }));
  `;

  const worker = new Worker(code, {
    eval: true,
    workerData: { sampleBuf: transferable, sampleRate, dir, filePath, normTarget: NORM_TARGET },
    transferList: [transferable as ArrayBuffer],
  });

  worker.on("message", (msg: unknown) => {
    if (msg && typeof msg === "object" && "error" in msg) {
      slog.warn("Worker audio save failed", { filePath, error: (msg as { error: string }).error });
    }
  });
  worker.on("error", (err: Error) => {
    slog.warn("Worker audio save failed", { filePath, error: err.message });
  });
}

export async function deleteAudioFile(filePath: string): Promise<void> {
  try {
    await fs.promises.access(filePath);
    await fs.promises.unlink(filePath);
    slog.info("Audio deleted", { filePath });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      slog.warn("Failed to delete audio file", { filePath, error: err });
    }
  }
}

export function decodeWavFile(filePath: string): RecordingResult {
  const buffer = fs.readFileSync(filePath);

  const sampleRate = buffer.readUInt32LE(24);
  const dataOffset = 44;
  const numSamples = (buffer.length - dataOffset) / 2; // 16-bit = 2 bytes per sample

  const audioBuffer = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const int16 = buffer.readInt16LE(dataOffset + i * 2);
    audioBuffer[i] = int16 < 0 ? int16 / 0x8000 : int16 / 0x7fff;
  }

  return { audioBuffer, sampleRate };
}

export async function cleanupOrphanedAudioFiles(validIds: Set<string>): Promise<void> {
  const dir = getAudioDir();
  let files: string[];
  try {
    files = (await fs.promises.readdir(dir)) as string[];
  } catch {
    return;
  }
  for (const file of files) {
    const id = path.basename(file, ".wav");
    if (!validIds.has(id)) {
      await deleteAudioFile(path.join(dir, file));
    }
  }
}
