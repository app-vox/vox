import { type LlmProvider } from "./provider";
import { type VoxConfig } from "../../shared/config";
import { FoundryProvider } from "./foundry";
import { BedrockProvider } from "./bedrock";
import { LLM_SYSTEM_PROMPT } from "../../shared/constants";

export function createLlmProvider(config: VoxConfig): LlmProvider {
  const customPrompt = config.customPrompt?.trim();
  const prompt = customPrompt && customPrompt !== LLM_SYSTEM_PROMPT
    ? `${LLM_SYSTEM_PROMPT}\n\nADDITIONAL CUSTOM INSTRUCTIONS:\n${customPrompt}`
    : LLM_SYSTEM_PROMPT;

  switch (config.llm.provider) {
    case "bedrock":
      return new BedrockProvider({
        region: config.llm.region,
        profile: config.llm.profile,
        accessKeyId: config.llm.accessKeyId,
        secretAccessKey: config.llm.secretAccessKey,
        modelId: config.llm.modelId,
        systemPrompt: prompt,
      });

    case "foundry":
    default:
      return new FoundryProvider({
        endpoint: config.llm.endpoint,
        apiKey: config.llm.apiKey,
        model: config.llm.model,
        systemPrompt: prompt,
      });
  }
}
