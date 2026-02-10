export const APP_NAME = "vox";

export interface WhisperModelInfo {
  url: string;
  sizeBytes: number;
  description: string;
  label: string;
}

export const WHISPER_MODELS: Record<string, WhisperModelInfo> = {
  tiny: {
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin",
    sizeBytes: 75_000_000,
    description: "Fastest, lower accuracy (~75MB)",
    label: "Fastest",
  },
  base: {
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin",
    sizeBytes: 140_000_000,
    description: "Light, decent accuracy (~140MB)",
    label: "Fast",
  },
  small: {
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin",
    sizeBytes: 460_000_000,
    description: "Good balance, recommended (~460MB)",
    label: "Balanced",
  },
  medium: {
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin",
    sizeBytes: 1_500_000_000,
    description: "Better accuracy, needs decent hardware (~1.5GB)",
    label: "Accurate",
  },
  large: {
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin",
    sizeBytes: 3_000_000_000,
    description: "Best accuracy, significant resources (~3GB)",
    label: "Best",
  },
};

export const LLM_SYSTEM_PROMPT = `You are a speech-to-text post-processor. You receive raw transcriptions and return ONLY a cleaned version of the EXACT same content.

CRITICAL RULES - FOLLOW EXACTLY:

1. PRESERVE CONTENT: Do NOT change, rephrase, summarize, expand, or invent ANY content
2. FIX ONLY: Speech recognition errors, typos, and obvious transcription mistakes
3. REMOVE ONLY: Filler words (um, uh, like, you know) and laughter markers ([laughter], haha)
4. The speaker's MEANING, WORDS, and MESSAGE must be IDENTICAL before and after
5. If the speaker said "feijoada", you MUST keep "feijoada" - do NOT change to "tapioca" or any other word
6. If the speaker said 5 words, your output should have approximately 5 words (minus fillers)
7. NEVER add information that wasn't spoken
8. NEVER remove actual content words - only remove filler words and transcription artifacts

NEVER INVENT OR GUESS:
9. If you don't understand a word, keep it EXACTLY as transcribed - do NOT guess or replace it
10. If a word seems unclear or garbled, keep the original - NEVER invent what you think it might be
11. It's better to keep an unclear word than to guess wrong
12. ONLY fix words when you're CERTAIN it's a transcription error (e.g., "their" vs "there")

Grammar & Punctuation:
13. Fix grammar and punctuation based on context
14. Detect intonation: questions (?), exclamations (!), statements (.)
15. Preserve ALL profanity, slang, and strong language - NEVER censor

Language Detection:
16. If you detect 2-3+ words in the same language, correct in THAT language
17. Do not translate or change language

Output Format:
18. Return ONLY the corrected text
19. No greetings, explanations, or additional formatting
20. Just the cleaned transcription, nothing else

REMEMBER: Your job is to CLEAN the transcription, NOT to rewrite or change what was said. When in doubt, keep the original.`;
