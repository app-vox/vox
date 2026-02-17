export type ThemeMode = "light" | "dark" | "system";

export type SupportedLanguage = "en" | "pt-BR" | "pt-PT" | "es" | "fr" | "de" | "it" | "pl" | "ru" | "tr";

export type AudioCueType =
  | "tap" | "tick" | "pop" | "ping" | "ding" | "nudge"
  | "click" | "beep" | "chime"
  | "error"
  | "none";

export type LlmProviderType = "foundry" | "bedrock" | "openai" | "deepseek" | "glm" | "litellm" | "anthropic" | "custom";

export type CustomTokenSendAs = "header" | "body" | "query";

export type WidgetPosition =
  | "top-left" | "top-center" | "top-right"
  | "center-left" | "center-center" | "center-right"
  | "bottom-left" | "bottom-center" | "bottom-right"
  | "custom";


export interface FoundryLlmConfig {
  provider: "foundry";
  endpoint: string;
  apiKey: string;
  model: string;
}

export interface BedrockLlmConfig {
  provider: "bedrock";
  region: string;
  profile: string;
  accessKeyId: string;
  secretAccessKey: string;
  modelId: string;
}

export interface OpenAICompatibleLlmConfig {
  provider: "openai" | "deepseek" | "glm" | "litellm";
  openaiApiKey: string;
  openaiModel: string;
  openaiEndpoint: string;
}

export interface AnthropicLlmConfig {
  provider: "anthropic";
  anthropicApiKey: string;
  anthropicModel: string;
}

export interface CustomLlmConfig {
  provider: "custom";
  customEndpoint: string;
  customToken: string;
  customTokenAttr: string;
  customTokenSendAs: CustomTokenSendAs;
  customModel: string;
}

export type LlmConfig =
  | FoundryLlmConfig
  | BedrockLlmConfig
  | OpenAICompatibleLlmConfig
  | AnthropicLlmConfig
  | CustomLlmConfig;

/** Flat intersection of all variants — used ONLY at the persistence boundary. */
export type LlmConfigFlat = Omit<FoundryLlmConfig, "provider"> &
  Omit<BedrockLlmConfig, "provider"> &
  Omit<OpenAICompatibleLlmConfig, "provider"> &
  Omit<AnthropicLlmConfig, "provider"> &
  Omit<CustomLlmConfig, "provider"> & { provider: LlmProviderType };

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
  analyticsEnabled: boolean;
  recordingAudioCue: AudioCueType;
  recordingStopAudioCue: AudioCueType;
  errorAudioCue: AudioCueType;
  showHud: boolean;
  hudShowOnHover: boolean;
  showHudActions: boolean;
  hudPosition: WidgetPosition;
  hudCustomX: number;
  hudCustomY: number;
  targetDisplayId: number | null;
  reduceAnimations: boolean;
  reduceVisualEffects: boolean;
}

export function createDefaultConfig(isProduction = false): VoxConfig {
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
    theme: "system",
    enableLlmEnhancement: false,
    llmConnectionTested: false,
    llmConfigHash: "",
    customPrompt: "",
    launchAtLogin: isProduction,
    dictionary: [],
    language: "system",
    analyticsEnabled: true,
    recordingAudioCue: "tap",
    recordingStopAudioCue: "pop",
    errorAudioCue: "error",
    showHud: false,
    hudShowOnHover: false,
    showHudActions: true,
    hudPosition: "bottom-center",
    hudCustomX: 0.5,
    hudCustomY: 0.9,
    targetDisplayId: null,
    reduceAnimations: false,
    reduceVisualEffects: false,
  };
}

export function createDefaultLlmFlat(): LlmConfigFlat {
  return {
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
  };
}

export function narrowLlmConfig(flat: LlmConfigFlat): LlmConfig {
  switch (flat.provider) {
    case "bedrock":
      return {
        provider: "bedrock",
        region: flat.region,
        profile: flat.profile,
        accessKeyId: flat.accessKeyId,
        secretAccessKey: flat.secretAccessKey,
        modelId: flat.modelId,
      };
    case "openai":
    case "deepseek":
    case "glm":
    case "litellm":
      return {
        provider: flat.provider,
        openaiApiKey: flat.openaiApiKey,
        openaiModel: flat.openaiModel,
        openaiEndpoint: flat.openaiEndpoint,
      };
    case "anthropic":
      return {
        provider: "anthropic",
        anthropicApiKey: flat.anthropicApiKey,
        anthropicModel: flat.anthropicModel,
      };
    case "custom":
      return {
        provider: "custom",
        customEndpoint: flat.customEndpoint,
        customToken: flat.customToken,
        customTokenAttr: flat.customTokenAttr,
        customTokenSendAs: flat.customTokenSendAs,
        customModel: flat.customModel,
      };
    case "foundry":
    default:
      return {
        provider: "foundry",
        endpoint: flat.endpoint,
        apiKey: flat.apiKey,
        model: flat.model,
      };
  }
}
