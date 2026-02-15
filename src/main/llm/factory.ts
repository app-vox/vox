import log from "electron-log/main";
import { type LlmProvider } from "./provider";
import { type VoxConfig } from "../../shared/config";
import { computeLlmConfigHash } from "../../shared/llm-config-hash";
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
  // When running a connection test, always create the real provider
  if (!options?.forTest) {
    // If LLM enhancement is disabled, return no-op provider
    if (!config.enableLlmEnhancement) {
      slog.info("LLM enhancement disabled, using NoopProvider");
      return new NoopProvider();
    }

    // If not tested or config changed since last test, block
    if (!config.llmConnectionTested || computeLlmConfigHash(config) !== config.llmConfigHash) {
      slog.info("LLM connection not tested or config changed, using NoopProvider");
      return new NoopProvider();
    }
  }

  // Append custom prompt at the END with CRITICAL emphasis (only if custom is not empty)
  const customPrompt = config.customPrompt?.trim();
  const hasCustomPrompt = !!customPrompt;
  const prompt = buildSystemPrompt(customPrompt || "", config.dictionary ?? []);

  slog.info("Creating provider: %s", config.llm.provider);
  slog.info("Custom prompt: %s", hasCustomPrompt ? "YES" : "NO");
  slog.debug("Custom prompt content", customPrompt);
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
