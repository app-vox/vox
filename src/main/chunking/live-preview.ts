import type { TranscriptionResult } from "../audio/whisper";
import { detectGarbage } from "../garbage";
import { LIVE_MIN_AUDIO_MS, LIVE_PASS_INTERVAL_MS } from "./constants";
import type { ChunkLog } from "./session";

/** The text of a live pass as the panel shows it: no bracketed, parenthesised or starred notes; null when nothing or garbage is left. */
export function cleanPreviewText(raw: string): string | null {
  const text = raw
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\*[^*]*\*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!text || !!detectGarbage(text)) return null;
  return text;
}

export interface LivePreviewOptions {
  sampleRate: number;
  /** The audio recorded so far, asked for each time a pass is due. */
  audio: () => Float32Array;
  transcribe: (audio: Float32Array, signal: AbortSignal) => Promise<TranscriptionResult>;
  onText: (text: string) => void;
  log: ChunkLog;
}

/**
 * Live passes over the audio so far, one at a time: the first after the delay
 * `start` is given, each next one `LIVE_PASS_INTERVAL_MS` after the previous
 * one ended.
 */
export class LivePreview {
  private readonly options: LivePreviewOptions;
  private timer: ReturnType<typeof setTimeout> | null = null;
  /** Changes with each `start` and `stop`, so a schedule that was stopped does nothing more. */
  private run = 0;
  private controller: AbortController | null = null;
  /** The last pass, which never rejects: `stop()` and the next `start` wait for it. */
  private ending: Promise<void> = Promise.resolve();

  constructor(options: LivePreviewOptions) {
    this.options = options;
  }

  /** Starts the schedule: the first pass is due after `firstDelayMs`. */
  start(firstDelayMs: number): void {
    this.clearTimer();
    this.schedule(firstDelayMs, ++this.run);
  }

  /** Ends the schedule and aborts the pass in flight; resolves once that pass has settled. */
  stop(): Promise<void> {
    this.run++;
    this.clearTimer();
    this.controller?.abort();
    return this.ending;
  }

  private clearTimer(): void {
    clearTimeout(this.timer ?? undefined);
    this.timer = null;
  }

  private schedule(delayMs: number, run: number): void {
    this.timer = setTimeout(() => void this.tick(run), delayMs);
  }

  private async tick(run: number): Promise<void> {
    this.timer = null;
    await this.ending;
    if (run !== this.run) return;
    const audio = this.options.audio();
    if ((audio.length / this.options.sampleRate) * 1000 < LIVE_MIN_AUDIO_MS) {
      this.schedule(LIVE_PASS_INTERVAL_MS, run);
      return;
    }
    const controller = new AbortController();
    this.controller = controller;
    this.ending = this.pass(audio, controller);
    await this.ending;
    this.controller = null;
    if (run === this.run) this.schedule(LIVE_PASS_INTERVAL_MS, run);
  }

  private async pass(audio: Float32Array, controller: AbortController): Promise<void> {
    try {
      const result = await this.options.transcribe(audio, controller.signal);
      if (controller.signal.aborted) return;
      const text = cleanPreviewText(result.text);
      if (text) this.options.onText(text);
    } catch (error) {
      if (controller.signal.aborted) return;
      this.options.log.debug("Live pass failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
