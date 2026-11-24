import type { RecordingResult } from "../audio/recorder";
import { FETCH_INTERVAL_MS } from "./constants";
import { ChunkSession, type ChunkSessionOptions, type SessionResult } from "./session";

/** Where a recording's samples come from while it runs. */
export interface SampleSource {
  samplesFrom(offset: number): Promise<Float32Array>;
}

export type ChunkedRecordingOptions = Omit<ChunkSessionOptions, "onChunkText">;

/** One running capture: its timer and whether it was ended. */
interface Capture {
  timer: ReturnType<typeof setInterval>;
  ended: boolean;
}

/**
 * A recording being transcribed chunk by chunk: it fetches the new audio from
 * the recorder every `FETCH_INTERVAL_MS` and feeds it to a `ChunkSession`.
 */
export class ChunkedRecording {
  readonly sampleRate: number;
  private readonly options: ChunkedRecordingOptions;
  private readonly session: ChunkSession;
  private capture: Capture | null = null;
  private fetching = false;

  constructor(options: ChunkedRecordingOptions) {
    this.options = options;
    this.sampleRate = options.sampleRate;
    this.session = new ChunkSession(options);
  }

  /** Starts asking `source` for the samples after those the session holds. */
  startCapture(source: SampleSource): void {
    this.endCapture();
    const capture: Capture = {
      ended: false,
      timer: setInterval(() => void this.fetch(source, capture), FETCH_INTERVAL_MS),
    };
    this.capture = capture;
  }

  /** Stops the fetches; one in flight is dropped when it answers. */
  endCapture(): Promise<void> {
    if (this.capture) {
      this.capture.ended = true;
      clearInterval(this.capture.timer);
      this.capture = null;
    }
    return Promise.resolve();
  }

  pause(): void {
    void this.endCapture();
    this.session.pause();
  }

  resume(): void {
    this.session.resume();
  }

  abort(): void {
    void this.endCapture();
    this.session.abort();
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
