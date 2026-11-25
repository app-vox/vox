import {
  FRAME_MS,
  MAX_CHUNK_MS,
  MAX_CUT_OFFSET_FRAMES,
  MAX_CUT_WINDOW_MS,
  MIN_CHUNK_MS,
  PAUSE_CUT_BACK_FRAMES,
  PAUSE_FRAMES,
  QUIET_RMS,
  QUIET_WINDOW_FRAMES,
} from "./constants";

export type CutRule = "pause" | "max";

export interface Cut {
  /** First sample of the chunk that starts at the cut, counted from the recording's start. */
  sample: number;
  rule: CutRule;
}

const MIN_CHUNK_FRAMES = MIN_CHUNK_MS / FRAME_MS;
const MAX_CHUNK_FRAMES = MAX_CHUNK_MS / FRAME_MS;
const MAX_CUT_WINDOW_FRAMES = MAX_CUT_WINDOW_MS / FRAME_MS;

/**
 * Cuts a recording into chunks as its samples arrive. A cut is decided at the
 * frame that completes it and never by later audio, so the cuts do not depend
 * on how the samples are split over the `push` calls.
 */
export class ChunkSplitter {
  private readonly frameSamples: number;
  /** RMS of the last frames, frame `i` at index `i % MAX_CUT_WINDOW_FRAMES`. */
  private readonly recentRms = new Float64Array(MAX_CUT_WINDOW_FRAMES);
  private partialSquares = 0;
  private partialCount = 0;
  /** Whole frames seen, which is also the index of the frame being filled. */
  private frame = 0;
  private chunkStart = 0;
  private quietRun = 0;
  private chunkHasSpeech = false;

  constructor(sampleRate: number) {
    this.frameSamples = (sampleRate * FRAME_MS) / 1000;
  }

  /** Takes the next samples of the recording and returns the cuts they complete. */
  push(samples: Float32Array): Cut[] {
    const cuts: Cut[] = [];
    for (let s = 0; s < samples.length; s++) {
      this.partialSquares += samples[s] * samples[s];
      if (++this.partialCount < this.frameSamples) continue;
      const cut = this.endFrame(Math.sqrt(this.partialSquares / this.frameSamples));
      if (cut) cuts.push(cut);
      this.partialSquares = 0;
      this.partialCount = 0;
    }
    return cuts;
  }

  private endFrame(rms: number): Cut | null {
    const i = this.frame++;
    this.recentRms[i % MAX_CUT_WINDOW_FRAMES] = rms;
    if (rms < QUIET_RMS) {
      this.quietRun++;
    } else {
      this.quietRun = 0;
      this.chunkHasSpeech = true;
    }

    const length = i + 1 - this.chunkStart;
    if (length >= MIN_CHUNK_FRAMES && this.chunkHasSpeech && this.quietRun >= PAUSE_FRAMES) {
      // Every frame from the cut to `i` is quiet.
      return this.cutAt(i - PAUSE_CUT_BACK_FRAMES, "pause", false);
    }
    if (length < MAX_CHUNK_FRAMES) return null;

    const cutFrame = this.quietestWindowStart(i) + MAX_CUT_OFFSET_FRAMES;
    let hasSpeech = false;
    for (let f = cutFrame; f <= i && !hasSpeech; f++) {
      hasSpeech = this.recentRms[f % MAX_CUT_WINDOW_FRAMES] >= QUIET_RMS;
    }
    return this.cutAt(cutFrame, "max", hasSpeech);
  }

  /** Earliest start of the quietest `QUIET_WINDOW_FRAMES` frames in a row among the recent frames up to `i`. */
  private quietestWindowStart(i: number): number {
    let quietest = 0;
    let lowest = Infinity;
    for (let k = i - MAX_CUT_WINDOW_FRAMES + 1; k <= i - QUIET_WINDOW_FRAMES + 1; k++) {
      // Summed afresh for each window, so equal windows compare equal.
      let sum = 0;
      for (let f = k; f < k + QUIET_WINDOW_FRAMES; f++) {
        sum += this.recentRms[f % MAX_CUT_WINDOW_FRAMES];
      }
      if (sum < lowest) {
        lowest = sum;
        quietest = k;
      }
    }
    return quietest;
  }

  private cutAt(frame: number, rule: CutRule, hasSpeech: boolean): Cut {
    this.chunkStart = frame;
    this.chunkHasSpeech = hasSpeech;
    return { sample: frame * this.frameSamples, rule };
  }
}
