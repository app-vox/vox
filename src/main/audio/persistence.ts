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

export function saveAudioFile(
  audioBuffer: Float32Array,
  sampleRate: number,
  entryId: string,
): string {
  const dir = getAudioDir();
  fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${entryId}.wav`);
  const normalized = normalizeAudio(audioBuffer);
  const wavBuffer = encodeWav(normalized, sampleRate);
  fs.writeFileSync(filePath, wavBuffer);

  slog.info("Audio saved", { filePath, samples: audioBuffer.length, sampleRate });
  return filePath;
}

export function deleteAudioFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      slog.info("Audio deleted", { filePath });
    }
  } catch (err) {
    slog.warn("Failed to delete audio file", { filePath, error: err });
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

export function cleanupOrphanedAudioFiles(validIds: Set<string>): void {
  const dir = getAudioDir();
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const id = path.basename(file, ".wav");
    if (!validIds.has(id)) {
      deleteAudioFile(path.join(dir, file));
    }
  }
}
