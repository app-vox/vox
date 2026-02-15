import type { LlmProviderType, LlmConfig } from "./config";

export function isProviderConfigured(provider: LlmProviderType, llm: LlmConfig): boolean {
  if (provider !== llm.provider) return false;
  switch (llm.provider) {
    case "foundry":
      return !!(llm.endpoint && llm.apiKey && llm.model);
    case "bedrock":
      return !!(llm.region && llm.modelId && (llm.profile || (llm.accessKeyId && llm.secretAccessKey)));
    case "openai":
    case "deepseek":
    case "glm":
      return !!(llm.openaiApiKey && llm.openaiModel && llm.openaiEndpoint);
    case "litellm":
      return !!(llm.openaiEndpoint && llm.openaiModel);
    case "anthropic":
      return !!(llm.anthropicApiKey && llm.anthropicModel);
    case "custom":
      return !!(llm.customEndpoint && llm.customToken && llm.customTokenAttr);
    default:
      return false;
  }
}

export function getLlmModelName(llm: LlmConfig): string {
  switch (llm.provider) {
    case "foundry":
      return llm.model;
    case "bedrock":
      return llm.modelId;
    case "openai":
    case "deepseek":
    case "glm":
    case "litellm":
      return llm.openaiModel;
    case "anthropic":
      return llm.anthropicModel;
    case "custom":
      return llm.customModel;
  }
}
