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

/** Characters of the previous chunk's text carried into the prompt: a sentence or two of context that still leaves the dictionary most of the prompt. */
export const CARRY_MAX_CHARS = 200;

/** A repeated phrase has at least this many words: a speaker repeats one or two words on purpose, as in "no, no, no". */
export const LOOP_MIN_PHRASE_WORDS = 3;

/** A phrase is a loop from this many occurrences in a row: a speaker says a phrase twice for emphasis, hardly three times. */
export const LOOP_MIN_REPEATS = 3;

/** Passes one chunk gets at most: the first and two retries, so a chunk that keeps looping or failing holds the rest up only briefly. */
export const MAX_CHUNK_PASSES = 3;

/** Temperatures of the retries after a loop: 0.4 lets whisper leave the loop, 0.8 is the last and strongest try. */
export const LOOP_RETRY_TEMPERATURES = [0.4, 0.8] as const;

/** Sample rate of the recorder window's audio context: whisper-cli reads 16 kHz audio, so no resampling follows. */
export const RECORDER_SAMPLE_RATE = 16_000;

/** The recording's new audio is fetched this often: short enough for chunks to close close to their cut, long enough to keep the window calls few. */
export const FETCH_INTERVAL_MS = 500;
