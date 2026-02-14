export type ThemeMode = "light" | "dark" | "system";

export type SupportedLanguage = "en" | "pt-BR" | "pt-PT" | "es" | "fr" | "de" | "it" | "ru" | "tr";

export type AudioCueType = "click" | "beep" | "chime" | "none";

export type LlmProviderType = "foundry" | "bedrock" | "openai" | "deepseek" | "litellm";

export interface LlmConfig {
  provider: LlmProviderType;

  // Foundry fields
  endpoint: string;
  apiKey: string;
  model: string;

  // Bedrock fields
  region: string;
  profile: string;
  accessKeyId: string;
  secretAccessKey: string;
  modelId: string;

  // OpenAI-compatible fields (OpenAI, DeepSeek)
  openaiApiKey: string;
  openaiModel: string;
  openaiEndpoint: string;
}

export interface WhisperConfig {
  model: WhisperModelSize | "";
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
  theme: ThemeMode;
  enableLlmEnhancement: boolean;
  customPrompt: string;
  launchAtLogin: boolean;
  dictionary: string[];
  language: SupportedLanguage | "system";
  recordingAudioCue: AudioCueType;
}

export function createDefaultConfig(isProduction = false): VoxConfig {
  return {
    llm: {
      provider: "foundry",
      endpoint: "",
      apiKey: "",
      model: "gpt-4o",
      region: "us-east-1",
      profile: "",
      accessKeyId: "",
      secretAccessKey: "",
      modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
      openaiApiKey: "",
      openaiModel: "gpt-4o",
      openaiEndpoint: "https://api.openai.com",
    },
    whisper: {
      model: "small",
    },
    shortcuts: {
      hold: "Alt+Space",
      toggle: "Alt+Shift+Space",
    },
    theme: "system",
    enableLlmEnhancement: false,
    customPrompt: "",
    launchAtLogin: isProduction,
    dictionary: [],
    language: "system",
    recordingAudioCue: "click",
  };
}
