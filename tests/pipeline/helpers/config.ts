import { readFileSync } from "fs";

export interface PipelineTestLlmConfig {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface PipelineTestConfig {
  llm: PipelineTestLlmConfig;
  whisper: {
    modelPath: string;
  };
}

let cachedConfig: PipelineTestConfig | null = null;

export function loadPipelineTestConfig(): PipelineTestConfig | null {
  if (cachedConfig) return cachedConfig;

  const configPath = process.env.VOX_PIPELINE_TEST_CONFIG;
  if (!configPath) return null;

  const content = readFileSync(configPath, "utf-8");
  cachedConfig = JSON.parse(content) as PipelineTestConfig;
  return cachedConfig;
}

export function requirePipelineTestConfig(): PipelineTestConfig {
  const config = loadPipelineTestConfig();
  if (!config) {
    throw new Error(
      "Pipeline test config not found. Set VOX_PIPELINE_TEST_CONFIG env var to the path of your config JSON file."
    );
  }
  return config;
}
