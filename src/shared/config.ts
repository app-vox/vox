export type ThemeMode = "light" | "dark" | "system";

export type SupportedLanguage = "en" | "pt-BR" | "pt-PT" | "es" | "fr" | "de" | "it" | "pl" | "ru" | "tr";

export type AudioCueType =
  | "tap" | "tick" | "pop" | "ping" | "ding" | "nudge"
  | "click" | "beep" | "chime"
  | "error"
  | "none";

export type LlmProviderType = "foundry" | "bedrock" | "openai" | "deepseek" | "glm" | "litellm" | "anthropic" | "custom";

export type CustomTokenSendAs = "header" | "body" | "query";

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

  // Anthropic fields
  anthropicApiKey: string;
  anthropicModel: string;

  // Custom provider fields
  customEndpoint: string;
  customToken: string;
  customTokenAttr: string;
  customTokenSendAs: CustomTokenSendAs;
  customModel: string;
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
  llmConnectionTested: boolean;
  llmConfigHash: string;
  customPrompt: string;
  launchAtLogin: boolean;
  dictionary: string[];
  language: SupportedLanguage | "system";
  recordingAudioCue: AudioCueType;
  recordingStopAudioCue: AudioCueType;
  errorAudioCue: AudioCueType;
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
      anthropicApiKey: "",
      anthropicModel: "claude-sonnet-4-20250514",
      customEndpoint: "",
      customToken: "",
      customTokenAttr: "Authorization",
      customTokenSendAs: "header",
      customModel: "",
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
    llmConnectionTested: false,
    llmConfigHash: "",
    customPrompt: "",
    launchAtLogin: isProduction,
    dictionary: [],
    language: "system",
    recordingAudioCue: "tap",
    recordingStopAudioCue: "pop",
    errorAudioCue: "error",
  };
}
