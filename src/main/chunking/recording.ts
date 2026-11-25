import type { RecordingResult } from "../audio/recorder";
import { buildWhisperArgs, buildWhisperPrompt } from "../../shared/constants";
import { FETCH_INTERVAL_MS, LIVE_FIRST_PASS_MS } from "./constants";
import { LivePreview } from "./live-preview";
import { ChunkSession, type ChunkSessionOptions, type SessionResult } from "./session";

/** Where a recording's samples come from while it runs. */
export interface SampleSource {
  samplesFrom(offset: number): Promise<Float32Array>;
}

export type ChunkedRecordingOptions = Omit<ChunkSessionOptions, "onChunkText" | "onFirstCut"> & {
  /** Gets what the text panel shows: a live pass's text, or the chunk texts so far joined. */
  onPreviewText?: (text: string, source: "live" | "chunks") => void;
};

/** One running capture: its timer and whether it was ended. */
interface Capture {
  timer: ReturnType<typeof setInterval>;
  ended: boolean;
}

/**
 * A recording being transcribed chunk by chunk: it fetches the new audio from
 * the recorder every `FETCH_INTERVAL_MS` and feeds it to a `ChunkSession`. It
 * also decides what the text panel gets: live passes until the first cut, then
 * the chunk texts as they become final.
 */
export class ChunkedRecording {
  readonly sampleRate: number;
  private readonly options: ChunkedRecordingOptions;
  private readonly session: ChunkSession;
  private readonly live: LivePreview;
  private capture: Capture | null = null;
  private fetching = false;
  private shown = false;
  private paused = false;
  private aborted = false;
  /** The session made its first cut: no live pass runs again. */
  private cut = false;
  /** Live passes are scheduled. */
  private liveOn = false;
  /** Live passes were scheduled before: a later start is due at once. */
  private liveStarted = false;

  constructor(options: ChunkedRecordingOptions) {
    this.options = options;
    this.sampleRate = options.sampleRate;
    this.session = new ChunkSession({
      ...options,
      onChunkText: (joined) => this.showChunks(joined),
      onFirstCut: () => {
        this.cut = true;
        this.syncLive();
        return this.live.stop();
      },
    });
    const args = buildWhisperArgs(options.speechLanguages);
    this.live = new LivePreview({
      sampleRate: options.sampleRate,
      audio: () => this.session.audioSoFar(),
      // A live pass is no chunk pass: it pins no language and carries no text.
      transcribe: (audio, signal) =>
        options.transcribe(audio, options.sampleRate, options.modelPath, {
          prompt: buildWhisperPrompt(options.dictionary, args.promptPrefix),
          language: args.language,
          speechLanguages: options.speechLanguages,
          signal,
        }),
      onText: (text) => {
        if (this.shown) options.onPreviewText?.(text, "live");
      },
      log: options.log,
    });
  }

  /** Starts asking `source` for the samples after those the session holds. */
  startCapture(source: SampleSource): void {
    this.endCapture();
    const capture: Capture = {
      ended: false,
      timer: setInterval(() => void this.fetch(source, capture), FETCH_INTERVAL_MS),
    };
    this.capture = capture;
    this.syncLive();
  }

  /** Stops the fetches, which a fetch in flight is dropped after, and the live passes. */
  endCapture(): Promise<void> {
    if (this.capture) {
      this.capture.ended = true;
      clearInterval(this.capture.timer);
      this.capture = null;
    }
    this.syncLive();
    return Promise.resolve();
  }

  /** Whether the text panel is open: live passes run only while it is, and reopening it shows the chunk texts so far. */
  setPreviewShown(shown: boolean): void {
    this.shown = shown;
    this.syncLive();
    if (shown && this.cut) this.showChunks(this.session.joinedText());
  }

  pause(): void {
    this.paused = true;
    void this.endCapture();
    this.session.pause();
  }

  resume(): void {
    this.paused = false;
    this.session.resume();
    this.syncLive();
    this.showChunks(this.session.joinedText());
  }

  abort(): void {
    this.aborted = true;
    void this.endCapture();
    this.session.abort();
  }

  /** Live passes run only while the preview is shown, the capture runs, the session has no cut and nothing is paused or aborted. */
  private syncLive(): void {
    const wanted = this.shown && !this.cut && !this.paused && !this.aborted && this.capture !== null;
    if (wanted === this.liveOn) return;
    this.liveOn = wanted;
    if (wanted) {
      this.live.start(this.liveStarted ? 0 : LIVE_FIRST_PASS_MS);
      this.liveStarted = true;
    } else {
      void this.live.stop();
    }
  }

  /** Sends the chunk texts so far to the panel while it is shown and the session runs. */
  private showChunks(joined: string): void {
    if (this.shown && !this.paused && joined !== "") this.options.onPreviewText?.(joined, "chunks");
  }

  /** Ends the capture, appends the samples of `recording` not fetched yet and finishes the session. */
  finish(recording: RecordingResult): Promise<SessionResult | null> {
    void this.endCapture();
    this.session.append(recording.audioBuffer.subarray(this.session.sampleCount));
    return this.session.finish();
  }

  /** One fetch at a time; an answer counts only while its capture runs and the session still ends at its offset. */
  private async fetch(source: SampleSource, capture: Capture): Promise<void> {
    if (this.fetching) return;
    this.fetching = true;
    const offset = this.session.sampleCount;
    try {
      const samples = await source.samplesFrom(offset);
      if (!capture.ended && this.session.sampleCount === offset) this.session.append(samples);
    } catch (error) {
      this.options.log.warn("Audio fetch failed", {
        offset,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.fetching = false;
    }
  }
}
