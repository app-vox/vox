import { CARRY_MAX_CHARS } from "./constants";

/** The end of the previous chunk's text that the next chunk's prompt carries: its last characters, from a word start. */
export function carriedText(previous: string): string {
  const start = Math.max(0, previous.length - CARRY_MAX_CHARS);
  if (start === 0 || previous[start - 1] === " ") return previous.slice(start);

  // The window starts inside a word: drop the word's rest, unless the window is that one word.
  const space = previous.indexOf(" ", start);
  return space === -1 ? previous.slice(start) : previous.slice(space + 1);
}
