import type { WhisperModule } from "../types";

export const binaryName: WhisperModule["binaryName"] = "whisper-cli";

// Metal GPU handles compute, so fewer CPU threads are needed.
export const threads: WhisperModule["threads"] = 4;

// Metal acceleration keeps inference fast — 30s is plenty.
export const timeout: WhisperModule["timeout"] = 30000;

// App logs: large model ran 0.06–0.23 s of inference per audio second; allow ~2x the worst case.
export const timeoutPerAudioSecond: WhisperModule["timeoutPerAudioSecond"] = 500;

// On macOS with Metal GPU, auto-detection overhead is negligible
// so we always use the detected language for accuracy.
export const resolveLanguage: WhisperModule["resolveLanguage"] = (detected) => detected;
