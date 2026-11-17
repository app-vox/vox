import log from "electron-log/main";
import { type LlmProvider } from "./provider";
import { type VoxConfig } from "../../shared/config";
import { isEnhancementReady } from "../../shared/llm-config-hash";
import { activeInstructions } from "../../shared/prompts";
import { buildSystemPrompt } from "../../shared/constants";
import { FoundryProvider } from "./foundry";
import { BedrockProvider } from "./bedrock";
import { OpenAICompatibleProvider } from "./openai-compatible";
import { AnthropicProvider } from "./anthropic";
import { CustomProvider } from "./custom";
import { NoopProvider } from "./noop";

const slog = log.scope("LlmFactory");

interface CreateLlmProviderOptions {
  forTest?: boolean;
}

export function createLlmProvider(config: VoxConfig, options?: CreateLlmProviderOptions): LlmProvider {
  // A connection test always creates the real provider; otherwise only a ready enhancement does
  if (!options?.forTest && !isEnhancementReady(config)) {
    slog.info("AI enhancement not ready (off, untested or changed since the test), using NoopProvider");
    return new NoopProvider();
  }

  // Append the active prompt's instructions at the END with CRITICAL emphasis (only if there are any)
  const instructions = activeInstructions(config);
  const hasCustomPrompt = instructions !== null;
  const prompt = buildSystemPrompt(instructions ?? "", config.dictionary ?? [], config.speechLanguages ?? []);

  slog.info("Creating provider: %s", config.llm.provider);
  slog.info("Custom prompt: %s", hasCustomPrompt ? "YES" : "NO");
  slog.debug("Custom prompt content", instructions);
  slog.debug("Full system prompt length: %d", prompt.length);

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
        hasCustomPrompt,
      });

    case "anthropic":
      return new AnthropicProvider({
        apiKey: config.llm.anthropicApiKey,
        model: config.llm.anthropicModel,
        endpoint: config.llm.anthropicEndpoint,
        customPrompt: prompt,
        hasCustomPrompt,
      });

    case "openai":
    case "deepseek":
    case "glm":
    case "litellm":
      return new OpenAICompatibleProvider({
        endpoint: config.llm.openaiEndpoint,
        apiKey: config.llm.openaiApiKey,
        model: config.llm.openaiModel,
        customPrompt: prompt,
        hasCustomPrompt,
        providerType: config.llm.provider as "openai" | "deepseek" | "glm" | "litellm",
      });

    case "custom":
      return new CustomProvider({
        endpoint: config.llm.customEndpoint,
        token: config.llm.customToken,
        tokenAttr: config.llm.customTokenAttr,
        tokenSendAs: config.llm.customTokenSendAs,
        model: config.llm.customModel,
        customPrompt: prompt,
        hasCustomPrompt,
      });

    case "foundry":
    default:
      return new FoundryProvider({
        endpoint: config.llm.endpoint,
        apiKey: config.llm.apiKey,
        model: config.llm.model,
        customPrompt: prompt,
        hasCustomPrompt,
      });
  }
}
