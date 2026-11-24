import { hasPhraseLoop } from "./chunking/loops";

export type GarbageReason = "short" | "hallucination" | "description" | "char-frequency" | "char-diversity" | "loop";

const COMMON_HALLUCINATIONS = [
  "thank you", "thanks for watching", "thank you for watching",
  "bye", "goodbye", "see you", "see you next time",
  "subscribe", "like and subscribe",
  "you", "uh", "um", "hmm", "ah", "oh",
  "thanks", "bye bye",
  "thank you so much", "thank you very much",
  "thanks for listening", "thanks for watching this video",
  "please subscribe", "please like and subscribe",
  "i'll see you in the next video", "see you in the next one",
  "i hope you enjoyed", "i hope you enjoyed this video",
  "the end", "...",
  "so", "okay", "ok", "yeah", "yes", "no", "right",
  "well", "like", "just", "actually",
  "\u5b57\u5e55\u7f51", "\u5b57\u5e55\u7ec4", "\u5b57\u5e55\u7531",
  "\u00e0 bient\u00f4t", "merci",
  "amara.org", "subtitles by",
  "subtitles by the amara.org community",
  "copyright", "all rights reserved",
];

export function detectGarbage(text: string): GarbageReason | null {
  const normalized = text.toLowerCase().trim();

  if (normalized.length < 5) return "short";

  if (COMMON_HALLUCINATIONS.includes(normalized)) return "hallucination";

  const withoutDescriptions = text
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\*[^*]*\*/g, "")
    .trim();

  if (!withoutDescriptions) return "description";

  const chars = withoutDescriptions.replace(/\s/g, "");
  if (chars.length === 0) return "description";

  const freq = new Map<string, number>();
  for (const ch of chars) {
    freq.set(ch, (freq.get(ch) ?? 0) + 1);
  }

  const maxFreq = Math.max(...freq.values());
  if (maxFreq / chars.length > 0.5) return "char-frequency";

  if (chars.length >= 10 && freq.size <= 2) return "char-diversity";
  if (chars.length >= 20 && freq.size <= 6) return "char-diversity";

  if (hasRepetitivePattern(normalized) || hasPhraseLoop(text)) return "loop";

  return null;
}

const MIN_SENTENCE_REPEATS = 3;
const MIN_NGRAM_SIZE = 3;
const NGRAM_DOMINANCE_RATIO = 0.5;

function hasRepetitivePattern(text: string): boolean {
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sentences.length >= MIN_SENTENCE_REPEATS) {
    const sentenceFreq = new Map<string, number>();
    for (const s of sentences) {
      sentenceFreq.set(s, (sentenceFreq.get(s) ?? 0) + 1);
    }

    const maxRepeats = Math.max(...sentenceFreq.values());
    if (maxRepeats >= MIN_SENTENCE_REPEATS && maxRepeats / sentences.length >= NGRAM_DOMINANCE_RATIO) {
      return true;
    }
  }

  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length < MIN_NGRAM_SIZE * MIN_SENTENCE_REPEATS) return false;

  for (const n of [MIN_NGRAM_SIZE, 4, 5]) {
    if (words.length < n * MIN_SENTENCE_REPEATS) continue;
    const ngramFreq = new Map<string, number>();
    for (let i = 0; i <= words.length - n; i++) {
      const ngram = words.slice(i, i + n).join(" ");
      ngramFreq.set(ngram, (ngramFreq.get(ngram) ?? 0) + 1);
    }

    const totalNgrams = words.length - n + 1;
    const uniqueNgrams = ngramFreq.size;
    const maxNgramRepeats = Math.max(...ngramFreq.values());

    if (
      totalNgrams >= MIN_NGRAM_SIZE * MIN_SENTENCE_REPEATS &&
      maxNgramRepeats >= MIN_SENTENCE_REPEATS &&
      uniqueNgrams / totalNgrams <= 0.2
    ) {
      return true;
    }
  }

  return false;
}
