import { type LlmProvider } from "./provider";

export interface FoundryConfig {
  endpoint: string;
  apiKey: string;
  model: string;
  customPrompt: string;
}

interface AnthropicResponse {
  content: { type: string; text: string }[];
}

export class FoundryProvider implements LlmProvider {
  private readonly config: FoundryConfig;

  constructor(config: FoundryConfig) {
    this.config = config;
  }

  async correct(rawText: string): Promise<string> {
    const hasCustom = this.config.customPrompt.includes("ADDITIONAL CUSTOM INSTRUCTIONS");
    console.log("[FoundryProvider] Enhancing text, custom prompt:", hasCustom ? "YES" : "NO");

    const base = this.config.endpoint.replace(/\/+$/, "");
    const url = `${base}/v1/messages`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.config.apiKey}`,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.config.model,
        system: this.config.customPrompt,
        messages: [
          { role: "user", content: rawText },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`LLM request failed: ${response.status} ${response.statusText} — ${body}`);
    }

    const data = await response.json() as AnthropicResponse;
    const textBlock = data.content.find((b) => b.type === "text");
    if (!textBlock) {
      throw new Error("LLM returned no text content");
    }
    return textBlock.text.trim();
  }
}
