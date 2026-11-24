import {
  ChunkSession,
  type ChunkSessionOptions,
  type TranscribeFn,
} from "../../../src/main/chunking/session";

export const RATE = 16000;

/** Audio in which every sample is `amplitude`. */
export function speech(seconds: number, amplitude = 0.1, rate = RATE): Float32Array {
  return new Float32Array(Math.round(seconds * rate)).fill(amplitude);
}

/** Audio of zeros. */
export function quiet(seconds: number, rate = RATE): Float32Array {
  return new Float32Array(Math.round(seconds * rate));
}

/** The parts one after the other. */
export function audio(...parts: Float32Array[]): Float32Array {
  const joined = new Float32Array(parts.reduce((length, part) => length + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.length;
  }
  return joined;
}

/** What `scriptedWhisper` answers a call with. */
export type Reply =
  | string
  | { text: string; language?: string }
  | Error
  | "hang"
  | Promise<string>
  | (() => string);

export interface WhisperCall {
  audio: Float32Array;
  samples: number;
  sampleRate: number;
  prompt: string;
  language: string;
  temperature?: number;
  signal?: AbortSignal;
}

/** Rejects with the signal's reason once it aborts, and stays pending without one. */
function hang(signal: AbortSignal | undefined): Promise<never> {
  return new Promise((_resolve, reject) => {
    if (signal?.aborted) reject(signal.reason);
    signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
  });
}

/**
 * Stands in for the whisper-cli process. Call n gets `replies[n]`: a string or
 * an object resolves, an `Error` rejects, `"hang"` stays pending until the
 * pass's signal aborts and then rejects with its reason, a promise is awaited,
 * a function is called for its text. A call past the script rejects.
 */
export function scriptedWhisper(replies: Reply[]): { transcribe: TranscribeFn; calls: WhisperCall[] } {
  const calls: WhisperCall[] = [];
  const transcribe: TranscribeFn = async (samples, sampleRate, _modelPath, pass) => {
    const n = calls.length;
    calls.push({
      audio: samples,
      samples: samples.length,
      sampleRate,
      prompt: pass.prompt,
      language: pass.language,
      temperature: pass.temperature,
      signal: pass.signal,
    });
    if (n >= replies.length) throw new Error(`unscripted whisper call ${n}`);
    const reply = replies[n];
    if (reply === "hang") return hang(pass.signal);
    if (reply instanceof Error) throw reply;
    if (typeof reply === "string") return { text: reply };
    if (typeof reply === "function") return { text: reply() };
    if (reply instanceof Promise) return { text: await reply };
    return reply;
  };
  return { transcribe, calls };
}

export function deferred<T>(): { promise: Promise<T>; resolve(value: T): void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

/** A recording of 819200 samples with pause cuts at 338240 and 683840. */
export function threeChunks(): Float32Array {
  return audio(speech(21), quiet(0.6), speech(21), quiet(0.6), speech(8));
}

/** The options of a test session: the one place an option gets its default. */
export function sessionOptions(
  whisper: { transcribe: TranscribeFn },
  overrides: Partial<ChunkSessionOptions> = {},
): ChunkSessionOptions {
  return {
    sampleRate: RATE,
    transcribe: whisper.transcribe,
    modelPath: "/models/test.bin",
    dictionary: [],
    speechLanguages: [],
    ...overrides,
  };
}

export function newSession(
  whisper: { transcribe: TranscribeFn },
  overrides?: Partial<ChunkSessionOptions>,
): ChunkSession {
  return new ChunkSession(sessionOptions(whisper, overrides));
}
