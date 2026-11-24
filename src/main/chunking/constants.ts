/** Frame of the cut rule: 20 ms is short enough to place a cut inside a pause between words. */
export const FRAME_MS = 20;

/** A frame is quiet below this RMS of its raw samples: above a silent room's noise, below soft speech. */
export const QUIET_RMS = 0.0046;

/** Quiet frames in a row that make a pause: 300 ms is a break between phrases, not a gap inside a word. */
export const PAUSE_FRAMES = 15;

/** A pause cut lies this many frames back, about the middle of the pause, so neither chunk loses a word's edge. */
export const PAUSE_CUT_BACK_FRAMES = 7;

/** No pause cut before this length: shorter chunks give whisper too little context. */
export const MIN_CHUNK_MS = 20_000;

/** A chunk is cut at this length even without a pause: whisper works on 30 s of audio at a time. */
export const MAX_CHUNK_MS = 30_000;

/** A cut without a pause is searched in this last part of the chunk, which keeps the chunk at least 20 s long. */
export const MAX_CUT_WINDOW_MS = 10_000;

/** A cut without a pause goes to the quietest run of this many frames: 100 ms spans a gap between words. */
export const QUIET_WINDOW_FRAMES = 5;

/** A cut without a pause lies this many frames into the quietest run, at its middle. */
export const MAX_CUT_OFFSET_FRAMES = 2;

/** A tail shorter than this is merged into the chunk before it: whisper transcribes a few seconds without context poorly. */
export const TAIL_MERGE_MS = 5_000;
