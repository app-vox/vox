import { readFileSync } from "fs";

export interface WavData {
  samples: Float32Array;
  sampleRate: number;
}

/**
 * Read a WAV file and return raw float samples with sample rate.
 * Supports PCM 16-bit (format 1) and IEEE Float 32-bit (format 3).
 */
export function readWav(filePath: string): WavData {
  const buffer = readFileSync(filePath);

  const fmtOffset = findChunk(buffer, "fmt ");
  if (fmtOffset === -1) throw new Error(`No fmt chunk in ${filePath}`);

  const audioFormat = buffer.readUInt16LE(fmtOffset + 8);
  const channels = buffer.readUInt16LE(fmtOffset + 10);
  const sampleRate = buffer.readUInt32LE(fmtOffset + 12);
  const bitsPerSample = buffer.readUInt16LE(fmtOffset + 22);

  if (channels !== 1) {
    throw new Error(`Expected mono audio, got ${channels} channels`);
  }

  const dataOffset = findChunk(buffer, "data");
  if (dataOffset === -1) throw new Error(`No data chunk in ${filePath}`);

  const dataSize = buffer.readUInt32LE(dataOffset + 4);
  const samplesStart = dataOffset + 8;

  let samples: Float32Array;

  if (audioFormat === 3 && bitsPerSample === 32) {
    // IEEE Float 32-bit — read directly into Float32Array
    const numSamples = dataSize / 4;
    samples = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      samples[i] = buffer.readFloatLE(samplesStart + i * 4);
    }
  } else if (audioFormat === 1 && bitsPerSample === 16) {
    // PCM 16-bit — normalize to [-1.0, 1.0]
    const numSamples = dataSize / 2;
    samples = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      samples[i] = buffer.readInt16LE(samplesStart + i * 2) / 32768;
    }
  } else {
    throw new Error(
      `Unsupported WAV format: audioFormat=${audioFormat}, bitsPerSample=${bitsPerSample}`,
    );
  }

  return { samples, sampleRate };
}

/**
 * Find a RIFF chunk by its 4-character ID. Returns the offset of the chunk
 * header (ID + size fields), or -1 if not found.
 */
function findChunk(buffer: Buffer, chunkId: string): number {
  const id = Buffer.from(chunkId, "ascii");
  let i = 12; // skip RIFF header (12 bytes)
  while (i < buffer.length - 8) {
    if (buffer.subarray(i, i + 4).equals(id)) return i;
    const chunkSize = buffer.readUInt32LE(i + 4);
    i += 8 + chunkSize;
    if (chunkSize % 2 !== 0) i++; // WAV chunks are word-aligned
  }
  return -1;
}
