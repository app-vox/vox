import { LOOP_MIN_PHRASE_WORDS, LOOP_MIN_REPEATS } from "./constants";

/** A phrase of `words` words that starts at word `start` and occurs `repeats` times in a row. */
export interface PhraseRun {
  start: number;
  words: number;
  repeats: number;
}

/** A word as it is compared: lower-cased, letters and digits only. */
function comparable(word: string): string {
  return word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

/**
 * The run with the earliest start and, at that start, the shortest phrase.
 * `words` are already comparable.
 */
export function findPhraseRun(words: string[]): PhraseRun | null {
  for (let start = 0; start < words.length; start++) {
    const longest = Math.floor((words.length - start) / LOOP_MIN_REPEATS);
    for (let size = LOOP_MIN_PHRASE_WORDS; size <= longest; size++) {
      let end = start + size;
      while (end < words.length && words[end] === words[end - size]) end++;
      const repeats = Math.floor((end - start) / size);
      if (repeats >= LOOP_MIN_REPEATS) return { start, words: size, repeats };
    }
  }
  return null;
}

export function hasPhraseLoop(text: string): boolean {
  const words = text.match(/\S+/g) ?? [];
  return findPhraseRun(words.map(comparable)) !== null;
}

/** Keeps the first occurrence of every run and leaves each other character as it is. */
export function collapseLoops(text: string): string {
  let collapsed = text;
  for (;;) {
    const words = [...collapsed.matchAll(/\S+/g)];
    const run = findPhraseRun(words.map((word) => comparable(word[0])));
    if (!run) return collapsed;

    const kept = collapsed.slice(0, words[run.start + run.words].index);
    const after = words[run.start + run.words * run.repeats];
    collapsed = after ? kept + collapsed.slice(after.index) : kept.trimEnd();
  }
}
