import { createLlmProvider } from "../../../src/main/llm/factory";
import {
  type VoxConfig,
  type LlmConfig,
  type LlmProviderType,
  createDefaultConfig,
} from "../../../src/shared/config";
import type { PipelineTestConfig } from "./config";

export interface PipelineRunnerOptions {
  dictionary?: string[];
  speechLanguages?: string[];
  customPrompt?: string;
}

export interface PipelineResult {
  rawTranscription: string;
  correctedText: string;
}

/**
 * Build a minimal VoxConfig from the pipeline test config.
 *
 * The factory reads `config.llm`, `config.enableLlmEnhancement`,
 * `config.llmConnectionTested`, `config.llmConfigHash`, `config.customPrompt`,
 * `config.dictionary`, and `config.speechLanguages`.
 *
 * We pass `forTest: true` so the factory skips the connection-tested and
 * hash guards, meaning we only need to populate the LLM connection fields
 * and the prompt-related fields.
 */
function buildVoxConfig(
  testConfig: PipelineTestConfig,
  options: PipelineRunnerOptions = {},
): VoxConfig {
  const llm = buildLlmConfig(testConfig);
  const base = createDefaultConfig();

  return {
    ...base,
    llm,
    enableLlmEnhancement: true,
    customPrompt: options.customPrompt ?? "",
    dictionary: options.dictionary ?? [],
    speechLanguages: options.speechLanguages ?? [],
  };
}

/**
 * Map the flat test config (`provider`, `apiKey`, `model`, `baseUrl`) into the
 * discriminated-union `LlmConfig` that the factory expects.
 */
function buildLlmConfig(testConfig: PipelineTestConfig): LlmConfig {
  const provider = testConfig.llm.provider as LlmProviderType;

  switch (provider) {
    case "anthropic":
      return {
        provider: "anthropic",
        anthropicApiKey: testConfig.llm.apiKey,
        anthropicModel: testConfig.llm.model,
      };

    case "openai":
    case "deepseek":
    case "glm":
    case "litellm":
      return {
        provider,
        openaiApiKey: testConfig.llm.apiKey,
        openaiModel: testConfig.llm.model,
        openaiEndpoint: testConfig.llm.baseUrl ?? "https://api.openai.com",
      };

    case "bedrock":
      return {
        provider: "bedrock",
        region: testConfig.llm.baseUrl ?? "us-east-1",
        profile: "",
        accessKeyId: testConfig.llm.apiKey,
        secretAccessKey: "",
        modelId: testConfig.llm.model,
      };

    case "custom":
      return {
        provider: "custom",
        customEndpoint: testConfig.llm.baseUrl ?? "",
        customToken: testConfig.llm.apiKey,
        customTokenAttr: "Authorization",
        customTokenSendAs: "header",
        customModel: testConfig.llm.model,
      };

    case "foundry":
    default:
      return {
        provider: "foundry",
        endpoint: testConfig.llm.baseUrl ?? "",
        apiKey: testConfig.llm.apiKey,
        model: testConfig.llm.model,
      };
  }
}

/**
 * Run only the LLM correction stage. The provided `rawText` acts as the
 * simulated Whisper output that the LLM will clean up.
 */
export async function runLlmCorrection(
  rawText: string,
  testConfig: PipelineTestConfig,
  options: PipelineRunnerOptions = {},
): Promise<PipelineResult> {
  const voxConfig = buildVoxConfig(testConfig, options);
  const provider = createLlmProvider(voxConfig, { forTest: true });
  const correctedText = await provider.correct(rawText);

  return {
    rawTranscription: rawText,
    correctedText,
  };
}

/**
 * Run the full pipeline: Whisper transcription followed by LLM correction.
 *
 * This is scaffolding for when audio test files are available. For now it
 * requires a Whisper model path in the test config and the `transcribe`
 * function from the main audio module.
 */
export async function runFullPipeline(
  audioBuffer: Float32Array,
  sampleRate: number,
  testConfig: PipelineTestConfig,
  options: PipelineRunnerOptions = {},
): Promise<PipelineResult> {
  // Dynamic import to avoid pulling in Electron dependencies at module load
  // time (the whisper module references `electron.app`).
  const { transcribe } = await import("../../../src/main/audio/whisper");

  const whisperResult = await transcribe(
    audioBuffer,
    sampleRate,
    testConfig.whisper.modelPath,
    options.dictionary ?? [],
    options.speechLanguages ?? [],
  );

  const rawTranscription = whisperResult.text;

  const voxConfig = buildVoxConfig(testConfig, options);
  const provider = createLlmProvider(voxConfig, { forTest: true });
  const correctedText = await provider.correct(rawTranscription);

  return {
    rawTranscription,
    correctedText,
  };
}
