import type { VoxConfig } from "./config";

function getProviderFields(config: VoxConfig): Record<string, string> {
  const llm = config.llm;

  switch (llm.provider) {
    case "bedrock":
      return {
        region: llm.region,
        profile: llm.profile,
        accessKeyId: llm.accessKeyId,
        secretAccessKey: llm.secretAccessKey,
        modelId: llm.modelId,
      };
    case "openai":
    case "deepseek":
    case "litellm":
      return {
        openaiApiKey: llm.openaiApiKey,
        openaiModel: llm.openaiModel,
        openaiEndpoint: llm.openaiEndpoint,
      };
    case "anthropic":
      return {
        anthropicApiKey: llm.anthropicApiKey,
        anthropicModel: llm.anthropicModel,
      };
    case "custom":
      return {
        customEndpoint: llm.customEndpoint,
        customToken: llm.customToken,
        customTokenAttr: llm.customTokenAttr,
        customTokenSendAs: llm.customTokenSendAs,
        customModel: llm.customModel,
      };
    case "foundry":
    default:
      return {
        endpoint: llm.endpoint,
        apiKey: llm.apiKey,
        model: llm.model,
      };
  }
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash.toString(36);
}

export function computeLlmConfigHash(config: VoxConfig): string {
  const relevant = {
    provider: config.llm.provider,
    ...getProviderFields(config),
  };
  return simpleHash(JSON.stringify(relevant));
}
