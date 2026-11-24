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
  /** Awaited once, before the first chunk pass starts: the live pass, which is a whisper process too, ends there. */
  onFirstCut?: () => Promise<void>;
}

/**
 * How a chunk's passes ended: `ok` with the first pass's text, with none or
 * with a loop no retry broke that collapsing leaves as it is, `retried` with
 * a later pass's, `collapsed` with a loop no retry broke, shortened,
 * `failed` with no text because its passes threw, `dropped` with a text the
 * garbage check rejected.
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
  /** Rounded to 2 decimals. */
  audioSeconds: number;
  /** What closed the chunk: a cut of the splitter, or the recording's end. */
  cut: CutRule | "end";
  /** Every pass over the chunk's audio: an aborted one and those of a chunk the tail merge replaced included. Rounded to 1 decimal. */
  whisperMs: number;
  /** The language the passes asked for; after `auto`, a colon and the one whisper reported, or `none`. */
  language: string;
  /** A pass over the chunk gave a loop. */
  loop: boolean;
  outcome: ChunkOutcome;
  /** The chunk's passes beyond the first, an aborted one not counted. */
  retries: number;
  /** The pass that gave the chunk's text, or the last pass of a chunk without text, started before `finish()` was called. */
  whileRecording: boolean;
  chars: number;
  /** The passes over the chunk as finally cut, after the pass over the earlier cut that the tail merge aborted, if any. */
  passes: PassRecord[];
}

export interface SessionResult {
  text: string;
  chunks: ChunkReport[];
  whisperMs: number;
  /** A chunk's text is a collapsed loop, or a chunk failed. */
  incomplete: boolean;
  /** The error of the first failed chunk's last pass. */
  error?: Error;
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
  /** What the chunk's last pass that threw threw. */
  error: Error | null;
  /** The language the chunk's first pass asked for. */
  language: string;
  /** What a pass over the chunk that asked for `auto` reported first. */
  reported: string | null;
  /** The chunk's last pass, or for a loop that no retry broke the first pass that gave one, started before `finish()` was called. */
  whileRecording: boolean;
  /** `whileRecording` of the first pass that gave a loop. */
  loopWhileRecording: boolean;
  /** The chunk's text is its loop, which no retry broke: nothing of it is carried on. */
  loopSurvived: boolean;
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
  return {
    text: "",
    retry: 0,
    loopText: null,
    passes: [],
    used: 0,
    error: null,
    language: "",
    reported: null,
    whileRecording: false,
    loopWhileRecording: false,
    loopSurvived: false,
    outcome: "ok",
  };
}

/**
 * Transcribes a recording chunk by chunk while it is still being made: it
 * keeps the samples, closes a chunk at each cut of the splitter and runs the
 * whisper passes one at a time, chunk by chunk in recording order. A pass
 * runs in the language the first one reported, when none is configured, and
 * its prompt carries the end of the text of the chunk before it. A chunk
 * gets up to `MAX_CHUNK_PASSES` passes: one whose text is a loop is retried
 * alone, and a pass that throws is repeated once. A loop that no retry broke
 * is collapsed; a chunk without usable text is left out, and the rest goes on.
 */
export class ChunkSession {
  readonly sampleRate: number;
  private readonly options: ChunkSessionOptions;
  private readonly splitter: ChunkSplitter;
  /** The first language a pass that asked for `auto` reported; later passes run in it. */
  private pinned: string | null = null;
  /** What `options.enhancing` answered, once the first pass has asked. */
  private enhancing: boolean | null = null;
  /** `finish()` was called. */
  private stopped = false;
  /** `pause()` was called and `resume()` has not been since: no new pass starts. */
  private paused = false;
  /** `abort()` was called: the session is dropped for good. */
  private aborted = false;
  /** Ends the wait of a `finish()` that waits for the passes, when the session pauses or aborts. */
  private wake: (() => void) | null = null;
  /** The recording so far, in the first `length` samples. */
  private samples = new Float32Array(0);
  private length = 0;
  private readonly chunks: Chunk[] = [];
  /** Index of the chunk whose pass runs, or of the next one to get a pass. */
  private next = 0;
  /** `onFirstCut` was awaited, or there is none. */
  private cutAnnounced = false;
  /** Aborts the pass that runs, which is over `chunks[next]`. */
  private inFlight: AbortController | null = null;
  /** Settles when no chunk waits for a pass. */
  private passes: Promise<void> | null = null;
  private result: Promise<SessionResult | null> | null = null;

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

  /** Takes the next samples of the recording and starts a pass over each chunk they close; a finished, paused or aborted session ignores them. */
  append(samples: Float32Array): void {
    if (this.stopped || this.paused || this.aborted) return;
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

  /**
   * Ends the recording: transcribes what no pass has covered and resolves once
   * every pass has ended, or with null when the session is paused or aborted
   * before every chunk has its text. A `finish()` after `resume()` goes on.
   */
  finish(): Promise<SessionResult | null> {
    this.result ??= this.complete().then((result) => {
      if (result === null) this.result = null;
      return result;
    });
    return this.result;
  }

  /** Keeps the texts and the pass in flight, and starts no new pass until `resume()`. */
  pause(): void {
    this.paused = true;
    this.wake?.();
  }

  /** Starts the next chunk that is missing its text. */
  resume(): void {
    if (this.aborted) return;
    this.paused = false;
    this.startPasses();
  }

  /** Aborts the pass in flight, drops the chunk texts and starts nothing again. */
  abort(): void {
    this.aborted = true;
    this.inFlight?.abort();
    for (const chunk of this.chunks) chunk.text = "";
    this.wake?.();
  }

  /** The recording so far. */
  audioSoFar(): Float32Array {
    return this.samples.subarray(0, this.length);
  }

  /** The texts of the chunks transcribed so far, in recording order. */
  joinedText(): string {
    return this.chunks
      .map((chunk) => chunk.text)
      .filter((text) => text !== "")
      .join(" ");
  }

  private async complete(): Promise<SessionResult | null> {
    if (this.aborted) return null;
    if (!this.stopped) {
      this.stopped = true;
      const last = this.chunks.at(-1);
      if (last && ((this.length - last.end) / this.sampleRate) * 1000 < TAIL_MERGE_MS) {
        this.mergeTail(last);
      } else {
        this.closeChunk(this.length, "end");
      }
    }
    while (!this.paused && !this.aborted && this.passes) {
      await Promise.race([this.passes, new Promise<void>((resolve) => (this.wake = resolve))]);
    }
    this.wake = null;
    if (this.aborted || (this.paused && this.next < this.chunks.length)) return null;

    const chunks = this.chunks.map((chunk, i) => {
      const fields = {
        index: i + 1,
        audioSeconds: Math.round(((chunk.end - chunk.start) / this.sampleRate) * 100) / 100,
        cut: chunk.cut,
        whisperMs: Number(chunk.whisperMs.toFixed(1)),
        language: chunk.language === "auto" ? `auto:${chunk.reported ?? "none"}` : chunk.language,
        loop: chunk.loopText !== null,
        outcome: chunk.outcome,
        retries: Math.max(0, chunk.used - 1),
        whileRecording: chunk.whileRecording,
        chars: chunk.text.length,
      };
      this.options.log.info("Chunk", fields);
      return { ...fields, passes: chunk.passes };
    });
    return {
      text: this.joinedText(),
      chunks,
      whisperMs: chunks.reduce((sum, chunk) => sum + chunk.whisperMs, 0),
      incomplete: chunks.some((chunk) => chunk.outcome === "collapsed" || chunk.outcome === "failed"),
      error: this.chunks.find((chunk) => chunk.outcome === "failed")?.error ?? undefined,
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
    if (this.passes || this.paused || this.aborted || this.next >= this.chunks.length) return;
    this.passes = this.runPasses();
    // `finish()` reports what stopped the passes; a pass that throws does not.
    this.passes.catch(() => {});
  }

  private async runPasses(): Promise<void> {
    while (!this.paused && !this.aborted && this.next < this.chunks.length) {
      await this.runPass(this.chunks[this.next]);
    }
    this.passes = null;
  }

  /**
   * One pass over `chunk`, which is `chunks[next]`. A pass the tail merge
   * aborted leaves the chunk for a new one and counts as no pass of it.
   */
  private async runPass(chunk: Chunk): Promise<void> {
    if (!this.cutAnnounced && this.options.onFirstCut) {
      this.cutAnnounced = true;
      await this.options.onFirstCut();
      if (this.paused || this.aborted) return;
    }
    const index = this.next;
    const abort = new AbortController();
    this.inFlight = abort;
    const whileRecording = !this.stopped;
    this.enhancing ??= this.options.enhancing();
    const previous = this.chunks[index - 1];
    // Only a pass that asked for `auto` pins a language, so a configured single language is never replaced.
    const settings = passSettings({
      dictionary: this.options.dictionary,
      speechLanguages: this.options.speechLanguages,
      pinnedLanguage: this.pinned,
      carried: previous && !previous.loopSurvived ? carriedText(previous.text) : "",
      retry: chunk.retry,
    });
    const record: PassRecord = { temperature: settings.temperature, bare: settings.bare, ms: 0, result: "aborted" };
    const started = performance.now();
    let answer: TranscriptionResult | Error;
    try {
      answer = await this.options.transcribe(
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
      answer = error instanceof Error ? error : new Error(String(error));
    }
    record.ms = performance.now() - started;
    chunk.whisperMs += record.ms;
    chunk.passes.push(record);
    this.inFlight = null;
    if (abort.signal.aborted) return;

    chunk.used++;
    if (chunk.used === 1) chunk.language = settings.language;
    chunk.whileRecording = whileRecording;
    if (answer instanceof Error) {
      record.result = "threw";
      this.options.log.warn("Chunk pass failed", {
        index: index + 1,
        pass: chunk.used,
        temperature: settings.temperature ?? 0,
        error: answer.message,
      });
      this.passThrew(chunk, answer);
      return;
    }
    if (settings.language === "auto") this.pinLanguage(answer.language, chunk, index);
    record.result = this.takeText(chunk, index, answer.text.trim());
  }

  /** Leaves `chunk` for a repeat of the pass that threw, with the same settings; a chunk gets one repeat. */
  private passThrew(chunk: Chunk, error: Error): void {
    const repeat = chunk.error === null && chunk.used < MAX_CHUNK_PASSES;
    chunk.error = error;
    if (!repeat) this.giveUp(chunk);
  }

  /** Takes the text of a pass over `chunk`: it ends the chunk's passes or leaves the chunk for a retry. */
  private takeText(chunk: Chunk, index: number, text: string): PassRecord["result"] {
    const reason = text === "" ? null : detectGarbage(text);
    // A loop is never taken; enhancement, when it is on, takes no garbage.
    const rejected = reason === "loop" || this.enhancing ? reason : null;
    if (rejected) {
      this.options.log.debug("Chunk text rejected", { index: index + 1, pass: chunk.used, reason: rejected, text });
    }
    if (reason === "loop") {
      if (chunk.loopText === null) {
        chunk.loopText = text;
        chunk.loopWhileRecording = chunk.whileRecording;
      }
      this.retryOrGiveUp(chunk);
      return "loop";
    }
    if (chunk.loopText === null) {
      if (rejected) {
        this.endPasses(chunk, "", `dropped:${rejected}`);
        return "rejected";
      }
      this.endPasses(chunk, text, text !== "" && chunk.error ? "retried" : "ok");
      return text === "" ? "empty" : "text";
    }
    // Only a text replaces the loop.
    if (text !== "" && !rejected) {
      this.endPasses(chunk, text, "retried");
      return "text";
    }
    this.retryOrGiveUp(chunk);
    return text === "" ? "empty" : "rejected";
  }

  /** Moves a chunk that looped to its next retry, or gives it up once its passes are used up. */
  private retryOrGiveUp(chunk: Chunk): void {
    if (chunk.used < MAX_CHUNK_PASSES) {
      chunk.retry = chunk.retry === 0 ? 1 : 2;
    } else {
      this.giveUp(chunk);
    }
  }

  /**
   * Ends the passes of a chunk that no pass gave a text: with its loop,
   * collapsed, or with nothing. A loop that collapsing leaves as it is has
   * lost no words, so its chunk ends `ok`.
   */
  private giveUp(chunk: Chunk): void {
    if (chunk.loopText !== null) {
      chunk.whileRecording = chunk.loopWhileRecording;
      chunk.loopSurvived = true;
      const collapsed = collapseLoops(chunk.loopText);
      this.endPasses(chunk, collapsed, collapsed === chunk.loopText ? "ok" : "collapsed");
    } else {
      this.endPasses(chunk, "", "failed");
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
      chunk.reported ??= reported;
    } else if (!chunk.noLanguageWarned) {
      chunk.noLanguageWarned = true;
      this.options.log.warn("Chunk reported no language", { index: index + 1 });
    }
  }
}
