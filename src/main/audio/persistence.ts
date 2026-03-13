import { app } from "electron";
import * as fs from "fs";
import * as path from "path";
import log from "electron-log/main";
import { encodeWav, normalizeAudio } from "./whisper";
import type { RecordingResult } from "./recorder";

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
