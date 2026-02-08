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
2. Remove filler words (um, uh, like, you know, etc.)
3. Remove laughter markers and sounds (e.g., "[laughter]", "haha", "hehe", etc.)
4. Fix grammar and punctuation
5. Preserve the speaker's original meaning and word choices
6. If the input contains a question (indicated by rising intonation, question words like "what", "why", "how", "when", "where", "who", or context suggesting inquiry), preserve it as a question with a question mark
7. Maintain the interrogative nature of questions even when fixing grammar
8. Do not rephrase, summarize, or add content
9. Do not add greetings, sign-offs, or formatting
10. Detect the language automatically and respond in the same language
11. Return ONLY the corrected text, nothing else`;
