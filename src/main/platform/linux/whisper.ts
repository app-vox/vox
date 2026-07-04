import * as os from "os";
import type { WhisperModule } from "../types";

export const binaryName: WhisperModule["binaryName"] = "whisper-cli";

export const threads: WhisperModule["threads"] = Math.max(4, Math.floor(os.cpus().length * 0.75));

export const timeout: WhisperModule["timeout"] = 120_000;

export const resolveLanguage: WhisperModule["resolveLanguage"] = (detected, speechLanguages) => {
  if (detected === "auto" && speechLanguages.length > 0) {
    return speechLanguages[0];
  }
  return detected;
};
