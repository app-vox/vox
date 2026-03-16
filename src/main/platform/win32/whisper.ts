import * as os from "os";
import type { WhisperModule } from "../types";

export const binaryName: WhisperModule["binaryName"] = "whisper-cli.exe";

// CPU-only: use ~75% of cores for best throughput without starving the OS.
// Minimum 4 to avoid slowdowns on low-core machines.
export const threads: WhisperModule["threads"] = Math.max(4, Math.floor(os.cpus().length * 0.75));

// CPU-only inference is much slower — allow up to 120s.
export const timeout: WhisperModule["timeout"] = 120000;

// On CPU-only platforms, language auto-detection runs the encoder twice
// (once to detect, once to transcribe), doubling latency. Use the first
// configured language instead; the LLM correction layer handles any
// cross-language artifacts.
export const resolveLanguage: WhisperModule["resolveLanguage"] = (detected, speechLanguages) => {
  if (detected === "auto" && speechLanguages.length > 0) {
    return speechLanguages[0];
  }
  return detected;
};
