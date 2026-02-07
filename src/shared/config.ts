export type LlmProviderType = "foundry" | "bedrock";

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
      region: "us-east-1",
      profile: "",
      accessKeyId: "",
      secretAccessKey: "",
      modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
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
