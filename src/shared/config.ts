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

/** Per-provider storage for OpenAI-compatible providers that share the same runtime fields. */
export interface PerProviderOpenAIFields {
  deepseekApiKey: string;
  deepseekModel: string;
  deepseekEndpoint: string;
  glmApiKey: string;
  glmModel: string;
  glmEndpoint: string;
  litellmApiKey: string;
  litellmModel: string;
  litellmEndpoint: string;
}

/** Flat intersection of all variants — used ONLY at the persistence boundary. */
export type LlmConfigFlat = Omit<FoundryLlmConfig, "provider"> &
  Omit<BedrockLlmConfig, "provider"> &
  Omit<OpenAICompatibleLlmConfig, "provider"> &
  Omit<AnthropicLlmConfig, "provider"> &
  Omit<CustomLlmConfig, "provider"> &
  PerProviderOpenAIFields & { provider: LlmProviderType };

export interface WhisperConfig {
  model: WhisperModelSize | "";
}

export type WhisperModelSize = "tiny" | "base" | "small" | "medium" | "large";

export type ShortcutMode = "hold" | "toggle" | "both";

export interface ShortcutsConfig {
  mode: ShortcutMode;
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
  speechLanguages: string[];
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
  copyToClipboard: boolean;
  lowercaseStart: boolean;
  shiftCapitalize: boolean;
  onboardingCompleted: boolean;
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
      mode: "toggle",
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
    speechLanguages: [],
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
    copyToClipboard: false,
    lowercaseStart: false,
    shiftCapitalize: true,
    onboardingCompleted: false,
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
    deepseekApiKey: "",
    deepseekModel: "deepseek-chat",
    deepseekEndpoint: "https://api.deepseek.com",
    glmApiKey: "",
    glmModel: "glm-4",
    glmEndpoint: "https://open.bigmodel.cn/api/paas/v4",
    litellmApiKey: "",
    litellmModel: "gpt-4o",
    litellmEndpoint: "http://localhost:4000",
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
      return {
        provider: "openai",
        openaiApiKey: flat.openaiApiKey,
        openaiModel: flat.openaiModel,
        openaiEndpoint: flat.openaiEndpoint,
      };
    case "deepseek":
      return {
        provider: "deepseek",
        openaiApiKey: flat.deepseekApiKey,
        openaiModel: flat.deepseekModel,
        openaiEndpoint: flat.deepseekEndpoint,
      };
    case "glm":
      return {
        provider: "glm",
        openaiApiKey: flat.glmApiKey,
        openaiModel: flat.glmModel,
        openaiEndpoint: flat.glmEndpoint,
      };
    case "litellm":
      return {
        provider: "litellm",
        openaiApiKey: flat.litellmApiKey,
        openaiModel: flat.litellmModel,
        openaiEndpoint: flat.litellmEndpoint,
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

/**
 * Maps a runtime LlmConfig back to flat keys for persistence.
 * OpenAI-compatible providers store their values in provider-specific fields
 * (e.g. deepseekApiKey, glmEndpoint) so switching providers doesn't overwrite
 * each other's saved configuration.
 */
export function spreadLlmToFlat(llm: LlmConfig): Partial<LlmConfigFlat> {
  switch (llm.provider) {
    case "deepseek":
      return {
        provider: "deepseek",
        deepseekApiKey: llm.openaiApiKey,
        deepseekModel: llm.openaiModel,
        deepseekEndpoint: llm.openaiEndpoint,
      };
    case "glm":
      return {
        provider: "glm",
        glmApiKey: llm.openaiApiKey,
        glmModel: llm.openaiModel,
        glmEndpoint: llm.openaiEndpoint,
      };
    case "litellm":
      return {
        provider: "litellm",
        litellmApiKey: llm.openaiApiKey,
        litellmModel: llm.openaiModel,
        litellmEndpoint: llm.openaiEndpoint,
      };
    default:
      return { ...llm };
  }
}
