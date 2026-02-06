import whisper from "whisper-node";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface TranscriptionResult {
  text: string;
}

/**
 * Transcribe an audio buffer using whisper.cpp via whisper-node.
 *
 * whisper-node expects a WAV file path, so we encode the Float32Array
 * to a temporary 16-bit PCM WAV file, run transcription, then clean up.
 */
export async function transcribe(
  audioBuffer: Float32Array,
  sampleRate: number,
  modelPath: string
): Promise<TranscriptionResult> {
  const tempPath = path.join(os.tmpdir(), `vox-recording-${Date.now()}.wav`);

  try {
    const wavBuffer = encodeWav(audioBuffer, sampleRate);
    fs.writeFileSync(tempPath, wavBuffer);

    const result = await whisper(tempPath, {
      modelPath,
      whisperOptions: {
        language: "auto",
      },
    });

    const text = (result ?? [])
      .map((segment: { speech: string }) => segment.speech)
      .join(" ")
      .trim();

    return { text };
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
}

/**
 * Encode a Float32Array of audio samples into a 16-bit PCM WAV buffer.
 *
 * @param samples - Mono audio samples in the range [-1, 1]
 * @param sampleRate - Sample rate in Hz (e.g. 16000)
 * @returns A Node.js Buffer containing a valid WAV file
 */
function encodeWav(samples: Float32Array, sampleRate: number): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = samples.length * (bitsPerSample / 8);
  const headerSize = 44;

  const buffer = Buffer.alloc(headerSize + dataSize);

  // RIFF header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);

  // fmt sub-chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // Sub-chunk size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // Audio format: PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Convert float samples to 16-bit signed integers
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    buffer.writeInt16LE(Math.round(int16), headerSize + i * 2);
  }

  return buffer;
}
