import { type LlmProvider } from "./provider";
import { type VoxConfig } from "../../shared/config";
import { LLM_SYSTEM_PROMPT } from "../../shared/constants";
import { FoundryProvider } from "./foundry";
import { BedrockProvider } from "./bedrock";
import { NoopProvider } from "./noop";

export function createLlmProvider(config: VoxConfig): LlmProvider {
  // If LLM enhancement is disabled, return no-op provider
  if (!config.enableLlmEnhancement) {
    return new NoopProvider();
  }

  // Append custom prompt AFTER default system prompt (only if custom is not empty)
  const customPrompt = config.customPrompt?.trim();
  const prompt = customPrompt
    ? `${LLM_SYSTEM_PROMPT}\n\nADDITIONAL CUSTOM INSTRUCTIONS:\n${customPrompt}`
    : LLM_SYSTEM_PROMPT;

  console.log("[Vox] Creating LLM provider with prompt length:", prompt.length);
  console.log("[Vox] Custom prompt present:", !!customPrompt);

  // Otherwise route to configured provider
  switch (config.llm.provider) {
    case "bedrock":
      return new BedrockProvider({
        region: config.llm.region,
        profile: config.llm.profile,
        accessKeyId: config.llm.accessKeyId,
        secretAccessKey: config.llm.secretAccessKey,
        modelId: config.llm.modelId,
        customPrompt: prompt,
      });

    case "foundry":
    default:
      return new FoundryProvider({
        endpoint: config.llm.endpoint,
        apiKey: config.llm.apiKey,
        model: config.llm.model,
        customPrompt: prompt,
      });
  }
}
