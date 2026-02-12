import { type LlmProvider } from "./provider";
import { type VoxConfig } from "../../shared/config";
import { buildSystemPrompt } from "../../shared/constants";
import { FoundryProvider } from "./foundry";
import { BedrockProvider } from "./bedrock";
import { OpenAICompatibleProvider } from "./openai-compatible";
import { NoopProvider } from "./noop";

export function createLlmProvider(config: VoxConfig): LlmProvider {
  const isDev = process.env.NODE_ENV === "development";

  // If LLM enhancement is disabled, return no-op provider
  if (!config.enableLlmEnhancement) {
    console.log("[LLM Factory] LLM enhancement is disabled, using NoopProvider");
    return new NoopProvider();
  }

  // Append custom prompt at the END with CRITICAL emphasis (only if custom is not empty)
  const customPrompt = config.customPrompt?.trim();
  const hasCustomPrompt = !!customPrompt;
  const prompt = buildSystemPrompt(customPrompt || "");

  console.log("[LLM Factory] Creating provider:", config.llm.provider);
  console.log("[LLM Factory] Custom prompt:", hasCustomPrompt ? "YES" : "NO");
  if (isDev && hasCustomPrompt) {
    console.log("[LLM Factory] [DEV] Custom prompt content:", customPrompt);
    console.log("[LLM Factory] [DEV] Full system prompt length:", prompt.length);
  }

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

    case "openai":
    case "deepseek":
    case "litellm":
      return new OpenAICompatibleProvider({
        endpoint: config.llm.openaiEndpoint,
        apiKey: config.llm.openaiApiKey,
        model: config.llm.openaiModel,
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
