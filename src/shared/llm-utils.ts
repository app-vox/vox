import type { LlmConfig } from "./config";

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
