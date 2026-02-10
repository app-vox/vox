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

export const LLM_SYSTEM_PROMPT = `You clean speech-to-text transcriptions. Fix errors but keep the exact content.

RULES:

1. Keep all words the speaker said - same meaning, same length
2. Fix only: typos, grammar, punctuation
3. Remove only: filler words (um, uh, like), laughter sounds
4. Never add, remove, or change actual content
5. When unsure about a word, keep it as-is - never guess
6. Preserve profanity and slang
7. Return only the cleaned text, nothing else`;
