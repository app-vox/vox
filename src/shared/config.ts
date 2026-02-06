export interface LlmConfig {
  provider: string;
  endpoint: string;
  apiKey: string;
  model: string;
}

export interface WhisperConfig {
  model: WhisperModelSize;
}

export type WhisperModelSize = "tiny" | "base" | "small" | "medium" | "large";

export interface ShortcutsConfig {
  hold: string;
  toggle: string;
}

export interface VoxConfig {
  llm: LlmConfig;
  whisper: WhisperConfig;
  shortcuts: ShortcutsConfig;
}

export function createDefaultConfig(): VoxConfig {
  return {
    llm: {
      provider: "foundry",
      endpoint: "",
      apiKey: "",
      model: "gpt-4o",
    },
    whisper: {
      model: "small",
    },
    shortcuts: {
      hold: "Alt+Space",
      toggle: "Alt+Shift+Space",
    },
  };
}
