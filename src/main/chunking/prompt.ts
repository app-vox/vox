import { buildWhisperArgs, buildWhisperPrompt } from "../../shared/constants";
import { CARRY_MAX_CHARS, LOOP_RETRY_TEMPERATURES } from "./constants";

export interface PassSettings {
  prompt: string;
  language: string;
  temperature?: number;
  /** The pass runs on the usual prompt alone: no dictionary, language prefix or carried text. */
  bare: boolean;
}

/**
 * What a pass over a chunk runs with. Retry 0 is the chunk's first pass; each
 * retry after a loop has its temperature, and the last one a bare prompt. The
 * language is the single configured one, else the pinned one, else `auto`.
 */
export function passSettings(input: {
  dictionary: string[];
  speechLanguages: string[];
  pinnedLanguage: string | null;
  carried: string;
  retry: 0 | 1 | 2;
}): PassSettings {
  const args = buildWhisperArgs(input.speechLanguages);
  const bare = input.retry === LOOP_RETRY_TEMPERATURES.length;
  return {
    prompt: bare
      ? buildWhisperPrompt([], "")
      : buildWhisperPrompt(input.dictionary, args.promptPrefix, input.carried),
    language: args.language === "auto" ? (input.pinnedLanguage ?? "auto") : args.language,
    temperature: input.retry === 0 ? undefined : LOOP_RETRY_TEMPERATURES[input.retry - 1],
    bare,
  };
}

/** The end of the previous chunk's text that the next chunk's prompt carries: its last characters, from a word start. */
export function carriedText(previous: string): string {
  const start = Math.max(0, previous.length - CARRY_MAX_CHARS);
  if (start === 0 || previous[start - 1] === " ") return previous.slice(start);

  // The window starts inside a word: drop the word's rest, unless the window is that one word.
  const space = previous.indexOf(" ", start);
  return space === -1 ? previous.slice(start) : previous.slice(space + 1);
}
