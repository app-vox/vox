import type { TranscriptionResult, WhisperPass } from "../audio/whisper";
import { detectGarbage, type GarbageReason } from "../garbage";
import { MAX_CHUNK_PASSES, TAIL_MERGE_MS } from "./constants";
import { collapseLoops } from "./loops";
import { carriedText, passSettings } from "./prompt";
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
  /** Whether the transcript goes on to enhancement, which takes no garbage. Asked once, when the first pass starts. */
  enhancing: () => boolean;
  /** Gets the chunk texts so far, joined, each time a chunk's text is final. */
  onChunkText?: (joined: string) => void;
}

/**
 * How a chunk's passes ended: `ok` with the first pass's text, `retried` with
 * a later pass's, `collapsed` with a loop no retry broke, `failed` without a
 * text, `dropped` with a text the garbage check rejected.
 */
export type ChunkOutcome = "ok" | "retried" | "collapsed" | "failed" | `dropped:${GarbageReason}`;

export interface PassRecord {
  temperature?: number;
  /** The pass ran on the usual prompt alone. */
  bare: boolean;
  ms: number;
  result: "text" | "loop" | "rejected" | "empty" | "threw" | "aborted";
}

export interface ChunkReport {
  /** Counted from 1. */
  index: number;
  audioSeconds: number;
  /** What closed the chunk: a cut of the splitter, or the recording's end. */
  cut: CutRule | "end";
  whisperMs: number;
  chars: number;
  /** A pass over the chunk gave a loop. */
  loop: boolean;
  outcome: ChunkOutcome;
  /** The chunk's passes beyond the first, an aborted one not counted. */
  retries: number;
  /** The passes over the chunk as finally cut. */
  passes: PassRecord[];
}

export interface SessionResult {
  text: string;
  chunks: ChunkReport[];
  whisperMs: number;
  /** A chunk's text is a collapsed loop. */
  incomplete: boolean;
}

/** What a chunk's passes have come to; a tail merge starts it anew. */
interface PassState {
  text: string;
  /** The retry the next pass runs at. */
  retry: 0 | 1 | 2;
  /** The text of the first pass that gave a loop. */
  loopText: string | null;
  passes: PassRecord[];
  /** Passes that ran to their end: `passes` without the aborted ones. */
  used: number;
  /** `ok` until the passes end. */
  outcome: ChunkOutcome;
}

interface Chunk extends PassState {
  start: number;
  end: number;
  cut: CutRule | "end";
  whisperMs: number;
  /** Set once the log says that a pass over the chunk reported no language. */
  noLanguageWarned: boolean;
}

function noPasses(): PassState {
  return { text: "", retry: 0, loopText: null, passes: [], used: 0, outcome: "ok" };
}

/**
 * Transcribes a recording chunk by chunk while it is still being made: it
 * keeps the samples, closes a chunk at each cut of the splitter and runs the
 * whisper passes one at a time, chunk by chunk in recording order. A pass
 * runs in the language the first one reported, when none is configured, and
 * its prompt carries the end of the text of the chunk before it. A chunk
 * whose text is a loop is retried alone, up to `MAX_CHUNK_PASSES` passes; a
 * loop that no retry broke is collapsed.
 */
export class ChunkSession {
  readonly sampleRate: number;
  private readonly options: ChunkSessionOptions;
  private readonly splitter: ChunkSplitter;
  /** The first language a pass that asked for `auto` reported; later passes run in it. */
  private pinned: string | null = null;
  /** What `options.enhancing` answered, once the first pass has asked. */
  private enhancing: boolean | null = null;
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
      loop: chunk.loopText !== null,
      outcome: chunk.outcome,
      retries: Math.max(0, chunk.used - 1),
      passes: chunk.passes,
    }));
    return {
      text: this.joinedText(),
      chunks,
      whisperMs: chunks.reduce((sum, chunk) => sum + chunk.whisperMs, 0),
      incomplete: chunks.some((chunk) => chunk.outcome === "collapsed"),
    };
  }

  /**
   * Drops the last cut: the chunk it closed now runs to the recording's end
   * and gets its passes anew, which keep the whisper time of the ones they replace.
   */
  private mergeTail(last: Chunk): void {
    const index = this.chunks.length - 1;
    last.end = this.length;
    last.cut = "end";
    Object.assign(last, noPasses());
    if (this.next === index) {
      this.inFlight?.abort();
    } else if (this.next > index) {
      this.next = index;
    }
    this.startPasses();
  }

  private closeChunk(end: number, cut: CutRule | "end"): void {
    const start = this.chunks.at(-1)?.end ?? 0;
    this.chunks.push({ start, end, cut, whisperMs: 0, noLanguageWarned: false, ...noPasses() });
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
    this.enhancing ??= this.options.enhancing();
    const previous = this.chunks[index - 1];
    // Only a pass that asked for `auto` pins a language, so a configured single language is never replaced.
    const settings = passSettings({
      dictionary: this.options.dictionary,
      speechLanguages: this.options.speechLanguages,
      pinnedLanguage: this.pinned,
      carried: previous && previous.outcome !== "collapsed" ? carriedText(previous.text) : "",
      retry: chunk.retry,
    });
    const record: PassRecord = { temperature: settings.temperature, bare: settings.bare, ms: 0, result: "aborted" };
    const started = performance.now();
    let transcription: TranscriptionResult;
    try {
      transcription = await this.options.transcribe(
        this.samples.subarray(chunk.start, chunk.end),
        this.sampleRate,
        this.options.modelPath,
        {
          prompt: settings.prompt,
          language: settings.language,
          speechLanguages: this.options.speechLanguages,
          temperature: settings.temperature,
          signal: abort.signal,
        },
      );
    } catch (error) {
      if (abort.signal.aborted) return;
      record.result = "threw";
      chunk.used++;
      throw error;
    } finally {
      record.ms = performance.now() - started;
      chunk.whisperMs += record.ms;
      chunk.passes.push(record);
      this.inFlight = null;
    }
    if (abort.signal.aborted) return;

    chunk.used++;
    if (settings.language === "auto") this.pinLanguage(transcription.language, chunk, index);
    record.result = this.takeText(chunk, transcription.text.trim());
  }

  /** Takes the text of a pass over `chunk`: it ends the chunk's passes or leaves the chunk for a retry. */
  private takeText(chunk: Chunk, text: string): PassRecord["result"] {
    const reason = text === "" ? null : detectGarbage(text);
    if (reason === "loop") {
      chunk.loopText ??= text;
      this.retryOrCollapse(chunk, chunk.loopText);
      return "loop";
    }
    if (chunk.loopText === null) {
      this.endPasses(chunk, text, "ok");
      return text === "" ? "empty" : "text";
    }
    // A retry's text replaces the loop when enhancement, if it is on, would take it.
    if (text !== "" && !(this.enhancing && reason)) {
      this.endPasses(chunk, text, "retried");
      return "text";
    }
    this.retryOrCollapse(chunk, chunk.loopText);
    return text === "" ? "empty" : "rejected";
  }

  /** Moves a chunk that looped to its next retry, or, its passes used up, ends them with the collapsed loop. */
  private retryOrCollapse(chunk: Chunk, loopText: string): void {
    if (chunk.used < MAX_CHUNK_PASSES) {
      chunk.retry = chunk.retry === 0 ? 1 : 2;
    } else {
      this.endPasses(chunk, collapseLoops(loopText), "collapsed");
    }
  }

  private endPasses(chunk: Chunk, text: string, outcome: ChunkOutcome): void {
    chunk.text = text;
    chunk.outcome = outcome;
    this.next++;
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
