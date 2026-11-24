import { recordedSamplesFrom } from "../../../src/main/audio/recorded-samples";
import type { RecordingResult } from "../../../src/main/audio/recorder";
import {
  ChunkSession,
  type ChunkLog,
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

/** A recording of 1331200 samples with pause cuts at 338240 and 683840 and a cut by the 30 s rule at 1004480. */
export function fourChunks(): Float32Array {
  return audio(speech(21), quiet(0.6), speech(21), quiet(0.6), speech(40));
}

/** `count` words `<prefix>000`, `<prefix>001`, … joined by one space. */
export function words(prefix: string, count: number): string {
  return Array.from({ length: count }, (_, i) => `${prefix}${String(i).padStart(3, "0")}`).join(" ");
}

/** 503 characters: `token000` to `token055`. A window of 200 characters starts inside `token033`. */
export const tokens = words("token", 56);

/** 300 characters: `w000` to `w059` and a full stop. A window of 200 characters starts at `w020`. */
export const text300 = `${words("w", 60)}.`;

/** 80 characters: shorter than the carried window. */
export const text80 = words("word", 10).padEnd(80, "!");

export interface LogLine {
  level: "info" | "warn" | "debug";
  message: string;
  fields: Record<string, unknown>;
}

/** A session log that keeps its lines, in the order they were written. */
export function collectLog(): { log: ChunkLog; lines: LogLine[] } {
  const lines: LogLine[] = [];
  const write = (level: LogLine["level"]) => (message: string, fields: Record<string, unknown>) => {
    lines.push({ level, message, fields });
  };
  return { log: { info: write("info"), warn: write("warn"), debug: write("debug") }, lines };
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
    log: collectLog().log,
    enhancing: () => false,
    ...overrides,
  };
}

export function newSession(
  whisper: { transcribe: TranscribeFn },
  overrides?: Partial<ChunkSessionOptions>,
): ChunkSession {
  return new ChunkSession(sessionOptions(whisper, overrides));
}

const RECORDER_BLOCK = 4096;

/**
 * Stands in for the recorder window, which is Electron's `BrowserWindow`. It
 * keeps the recorded part as blocks of 4096 samples, like `window._recChunks`.
 */
export class FakeRecorder {
  readonly fetches: { offset: number; returned: number }[] = [];
  private recording: Float32Array;
  private blocks: number[][] = [];
  private recorded = 0;
  private failure: Error | null = null;

  constructor(recording: Float32Array, private readonly sampleRate = RATE) {
    this.recording = recording;
  }

  /** Replaces the recording that `recordUpTo` plays from; nothing counts as recorded yet. */
  load(recording: Float32Array): void {
    this.recording = recording;
    this.blocks = [];
    this.recorded = 0;
  }

  /** Records up to `seconds` of the recording, whole blocks first and the rest as a short last block. */
  recordUpTo(seconds: number): void {
    const target = Math.min(Math.round(seconds * this.sampleRate), this.recording.length);
    while (this.recorded < target) {
      const last = this.blocks[this.blocks.length - 1];
      if (last && last.length < RECORDER_BLOCK) {
        // a short block only ends a recording that stopped there: keep blocks full while it grows
        const room = Math.min(RECORDER_BLOCK - last.length, target - this.recorded);
        for (let i = 0; i < room; i++) last.push(this.recording[this.recorded + i]);
        this.recorded += room;
        continue;
      }
      const size = Math.min(RECORDER_BLOCK, target - this.recorded);
      this.blocks.push(Array.from(this.recording.subarray(this.recorded, this.recorded + size)));
      this.recorded += size;
    }
  }

  /** The next fetch rejects with `error`. */
  failNextFetch(error: Error): void {
    this.failure = error;
  }

  async start(): Promise<void> {}

  async stop(): Promise<RecordingResult> {
    return { audioBuffer: Float32Array.from(recordedSamplesFrom(this.blocks, 0)), sampleRate: this.sampleRate };
  }

  async cancel(): Promise<void> {}

  async samplesFrom(offset: number): Promise<Float32Array> {
    if (this.failure) {
      const error = this.failure;
      this.failure = null;
      this.fetches.push({ offset, returned: 0 });
      throw error;
    }
    const samples = Float32Array.from(recordedSamplesFrom(this.blocks, offset));
    this.fetches.push({ offset, returned: samples.length });
    return samples;
  }
}
