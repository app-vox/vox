import { type LlmProvider } from "./provider";
import { type VoxConfig } from "../../shared/config";
import { FoundryProvider } from "./foundry";
import { BedrockProvider } from "./bedrock";
import { NoopProvider } from "./noop";

export function createLlmProvider(config: VoxConfig): LlmProvider {
  // If LLM enhancement is disabled, return no-op provider
  if (!config.enableLlmEnhancement) {
    return new NoopProvider();
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
      });

    case "foundry":
    default:
      return new FoundryProvider({
        endpoint: config.llm.endpoint,
        apiKey: config.llm.apiKey,
        model: config.llm.model,
      });
  }
}
