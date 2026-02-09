export const APP_NAME = "vox";

export interface WhisperModelInfo {
  url: string;
  sizeBytes: number;
  description: string;
}

export const WHISPER_MODELS: Record<string, WhisperModelInfo> = {
  tiny: {
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin",
    sizeBytes: 75_000_000,
    description: "Fastest, lower accuracy (~75MB)",
  },
  base: {
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin",
    sizeBytes: 140_000_000,
    description: "Light, decent accuracy (~140MB)",
  },
  small: {
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin",
    sizeBytes: 460_000_000,
    description: "Good balance, recommended (~460MB)",
  },
  medium: {
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin",
    sizeBytes: 1_500_000_000,
    description: "Better accuracy, needs decent hardware (~1.5GB)",
  },
  large: {
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin",
    sizeBytes: 3_000_000_000,
    description: "Best accuracy, significant resources (~3GB)",
  },
};

export const LLM_SYSTEM_PROMPT = `You are a speech-to-text post-processor. You receive raw transcriptions and return a cleaned version. Rules:

1. Fix speech recognition errors and typos
2. Auto-correct words that don't fit context or are obvious mistakes
3. Remove ONLY filler words (um, uh, like, you know, etc.) - NOT actual content words
4. Remove laughter markers and sounds (e.g., "[laughter]", "haha", "hehe", etc.)
5. Fix grammar and punctuation based on intonation and context
6. CRITICAL: Preserve ALL words the speaker said, including profanity, slang, and strong language
7. NEVER censor, remove, or replace profanity or controversial words
8. NEVER sanitize or "clean up" the user's language choices
9. Detect speaker's intonation and emotion:
   - Questions (rising intonation, question words) → use question mark (?)
   - Exclamations (excitement, emphasis, commands) → use exclamation mark (!)
   - Statements (neutral tone) → use period (.)
10. Pay attention to emotional cues: loud volume, emphasis, urgency, excitement should get exclamation marks
11. Do not rephrase, summarize, or add content beyond fixing transcription errors
12. Do not add greetings, sign-offs, or formatting
13. If you detect 2-3 or more words in the same language, that's likely the user's language. Correct in that language.
14. Return ONLY the corrected text, nothing else`;
