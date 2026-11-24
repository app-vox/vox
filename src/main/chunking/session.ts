import { buildWhisperArgs, buildWhisperPrompt, type WhisperArgs } from "../../shared/constants";
import type { TranscriptionResult, WhisperPass } from "../audio/whisper";
import { TAIL_MERGE_MS } from "./constants";
import { carriedText } from "./prompt";
import { ChunkSplitter, type CutRule } from "./splitter";

export type TranscribeFn = (
  audio: Float32Array,
  sampleRate: number,
  modelPath: string,
  pass: WhisperPass,
) => Promise<TranscriptionResult>;

/** Where the session writes its log lines. */
export interface ChunkLog {
  info(message: string, fields: Record<string, unknown>): void;
  warn(message: string, fields: Record<string, unknown>): void;
  debug(message: string, fields: Record<string, unknown>): void;
}

export interface ChunkSessionOptions {
  sampleRate: number;
  transcribe: TranscribeFn;
  modelPath: string;
  dictionary: string[];
  speechLanguages: string[];
  log: ChunkLog;
  /** Gets the chunk texts so far, joined, each time a chunk's text is final. */
  onChunkText?: (joined: string) => void;
}

export interface ChunkReport {
  /** Counted from 1. */
  index: number;
  audioSeconds: number;
  /** What closed the chunk: a cut of the splitter, or the recording's end. */
  cut: CutRule | "end";
  whisperMs: number;
  chars: number;
}

export interface SessionResult {
  text: string;
  chunks: ChunkReport[];
  whisperMs: number;
}

interface Chunk {
  start: number;
  end: number;
  cut: CutRule | "end";
  text: string;
  whisperMs: number;
  /** Set once the log says that a pass over the chunk reported no language. */
  noLanguageWarned: boolean;
}

/**
 * Transcribes a recording chunk by chunk while it is still being made: it
 * keeps the samples, closes a chunk at each cut of the splitter and runs one
 * whisper pass per chunk, one at a time, in recording order. A pass runs in
 * the language the first one reported, when none is configured, and its
 * prompt carries the end of the text of the chunk before it.
 */
export class ChunkSession {
  readonly sampleRate: number;
  private readonly options: ChunkSessionOptions;
  private readonly splitter: ChunkSplitter;
  /** The configured language, `auto` when there is none or several, and the prompt prefix that names several. */
  private readonly args: WhisperArgs;
  /** The first language a pass that asked for `auto` reported; later passes run in it. */
  private pinned: string | undefined;
  /** The recording so far, in the first `length` samples. */
  private samples = new Float32Array(0);
  private length = 0;
  private readonly chunks: Chunk[] = [];
  /** Index of the chunk whose pass runs, or of the next one to get a pass. */
  private next = 0;
  /** Aborts the pass that runs, which is over `chunks[next]`. */
  private inFlight: AbortController | null = null;
  /** Settles when no chunk waits for a pass; stays rejected once a pass threw. */
  private passes: Promise<void> | null = null;
  private result: Promise<SessionResult> | null = null;

  constructor(options: ChunkSessionOptions) {
    this.options = options;
    this.sampleRate = options.sampleRate;
    this.splitter = new ChunkSplitter(options.sampleRate);
    this.args = buildWhisperArgs(options.speechLanguages);
  }

  get sampleCount(): number {
    return this.length;
  }

  /** Cuts made so far. */
  get cutCount(): number {
    return this.chunks.filter((chunk) => chunk.cut !== "end").length;
  }

  /** Takes the next samples of the recording and starts a pass over each chunk they close. */
  append(samples: Float32Array): void {
    const needed = this.length + samples.length;
    if (needed > this.samples.length) {
      // Passes in flight keep reading the old buffer, whose samples never change.
      const grown = new Float32Array(Math.max(needed, this.samples.length * 2));
      grown.set(this.samples.subarray(0, this.length));
      this.samples = grown;
    }
    this.samples.set(samples, this.length);
    this.length = needed;

    for (const cut of this.splitter.push(samples)) {
      this.closeChunk(cut.sample, cut.rule);
    }
  }

  /** Ends the recording: transcribes what no pass has covered and resolves once every pass has ended. */
  finish(): Promise<SessionResult> {
    this.result ??= this.complete();
    return this.result;
  }

  /** The texts of the chunks transcribed so far, in recording order. */
  joinedText(): string {
    return this.chunks
      .map((chunk) => chunk.text)
      .filter((text) => text !== "")
      .join(" ");
  }

  private async complete(): Promise<SessionResult> {
    const last = this.chunks.at(-1);
    if (last && ((this.length - last.end) / this.sampleRate) * 1000 < TAIL_MERGE_MS) {
      this.mergeTail(last);
    } else {
      this.closeChunk(this.length, "end");
    }
    await this.passes;

    const chunks = this.chunks.map((chunk, i) => ({
      index: i + 1,
      audioSeconds: (chunk.end - chunk.start) / this.sampleRate,
      cut: chunk.cut,
      whisperMs: chunk.whisperMs,
      chars: chunk.text.length,
    }));
    return {
      text: this.joinedText(),
      chunks,
      whisperMs: chunks.reduce((sum, chunk) => sum + chunk.whisperMs, 0),
    };
  }

  /**
   * Drops the last cut: the chunk it closed now runs to the recording's end
   * and gets a new pass, which keeps the whisper time of the passes it replaces.
   */
  private mergeTail(last: Chunk): void {
    const index = this.chunks.length - 1;
    last.end = this.length;
    last.cut = "end";
    last.text = "";
    if (this.next === index) {
      this.inFlight?.abort();
    } else if (this.next > index) {
      this.next = index;
    }
    this.startPasses();
  }

  private closeChunk(end: number, cut: CutRule | "end"): void {
    const start = this.chunks.at(-1)?.end ?? 0;
    this.chunks.push({ start, end, cut, text: "", whisperMs: 0, noLanguageWarned: false });
    this.startPasses();
  }

  private startPasses(): void {
    if (this.passes) return;
    this.passes = this.runPasses();
    // `finish()` reports a pass that threw.
    this.passes.catch(() => {});
  }

  private async runPasses(): Promise<void> {
    while (this.next < this.chunks.length) {
      await this.runPass(this.chunks[this.next]);
    }
    this.passes = null;
  }

  /** One pass over `chunk`, which is `chunks[next]`. A pass the tail merge aborted leaves the chunk for a new one. */
  private async runPass(chunk: Chunk): Promise<void> {
    const index = this.next;
    const abort = new AbortController();
    this.inFlight = abort;
    // Only a pass that asked for `auto` pins a language, so a configured single language is never replaced.
    const language = this.pinned ?? this.args.language;
    const started = performance.now();
    try {
      const result = await this.options.transcribe(
        this.samples.subarray(chunk.start, chunk.end),
        this.sampleRate,
        this.options.modelPath,
        {
          prompt: buildWhisperPrompt(
            this.options.dictionary,
            this.args.promptPrefix,
            carriedText(this.chunks[index - 1]?.text ?? ""),
          ),
          language,
          speechLanguages: this.options.speechLanguages,
          signal: abort.signal,
        },
      );
      if (abort.signal.aborted) return;
      if (language === "auto") this.pinLanguage(result.language, chunk, index);
      chunk.text = result.text.trim();
      this.next++;
    } catch (error) {
      if (!abort.signal.aborted) throw error;
      return;
    } finally {
      chunk.whisperMs += performance.now() - started;
      this.inFlight = null;
    }
    this.options.onChunkText?.(this.joinedText());
  }

  /** Takes what a pass over `chunk` that asked for `auto` reported. */
  private pinLanguage(reported: string | undefined, chunk: Chunk, index: number): void {
    if (reported !== undefined) {
      this.pinned ??= reported;
    } else if (!chunk.noLanguageWarned) {
      chunk.noLanguageWarned = true;
      this.options.log.warn("Chunk reported no language", { index: index + 1 });
    }
  }
}
