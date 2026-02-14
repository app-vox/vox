import log from "electron-log/main";
import { BaseLlmProvider } from "./base-provider";

export interface FoundryConfig {
  endpoint: string;
  apiKey: string;
  model: string;
  customPrompt: string;
  hasCustomPrompt: boolean;
}

interface AnthropicResponse {
  content: { type: string; text: string }[];
}

export class FoundryProvider extends BaseLlmProvider {
  protected readonly providerName = "Foundry";
  private readonly config: FoundryConfig;

  constructor(config: FoundryConfig) {
    super();
    this.config = config;
  }

  protected async enhance(rawText: string): Promise<string> {
    const base = this.config.endpoint.replace(/\/+$/, "");
    const url = `${base}/v1/messages`;

    const requestBody = {
      model: this.config.model,
      system: this.config.customPrompt,
      messages: [
        { role: "user", content: rawText },
      ],
      temperature: 0.1,
      max_tokens: 4096,
    };

    log.scope(this.providerName).debug("Request body", requestBody);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.config.apiKey}`,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(requestBody),
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

  protected hasCustomPrompt(): boolean {
    return this.config.hasCustomPrompt;
  }

  protected getCustomPrompt(): string {
    return this.config.customPrompt;
  }
}
