import { type LlmProvider } from "./provider";
import { type LlmConfig } from "../../shared/config";
import { FoundryProvider } from "./foundry";
import { BedrockProvider } from "./bedrock";

export function createLlmProvider(config: LlmConfig): LlmProvider {
  switch (config.provider) {
    case "bedrock":
      return new BedrockProvider({
        region: config.region,
        profile: config.profile,
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        modelId: config.modelId,
      });

    case "foundry":
    default:
      return new FoundryProvider({
        endpoint: config.endpoint,
        apiKey: config.apiKey,
        model: config.model,
      });
  }
}
