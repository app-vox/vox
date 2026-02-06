import { type LlmProvider } from "./provider";
import { LLM_SYSTEM_PROMPT } from "../../shared/constants";

export interface FoundryConfig {
  endpoint: string;
  apiKey: string;
  model: string;
}

export class FoundryProvider implements LlmProvider {
  private readonly config: FoundryConfig;

  constructor(config: FoundryConfig) {
    this.config = config;
  }

  async correct(rawText: string): Promise<string> {
    const url = `${this.config.endpoint}/openai/deployments/${this.config.model}/chat/completions?api-version=2024-02-01`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": this.config.apiKey,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: LLM_SYSTEM_PROMPT },
          { role: "user", content: rawText },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { choices: { message: { content: string } }[] };
    return data.choices[0].message.content.trim();
  }
}
