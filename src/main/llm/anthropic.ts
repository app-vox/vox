import log from "electron-log/main";
import { BaseLlmProvider } from "./base-provider";

export interface AnthropicConfig {
  apiKey: string;
  model: string;
  customPrompt: string;
  hasCustomPrompt: boolean;
}

interface AnthropicResponse {
  content: { type: string; text: string }[];
}

export class AnthropicProvider extends BaseLlmProvider {
  protected readonly providerName = "Anthropic";
  private readonly config: AnthropicConfig;

  constructor(config: AnthropicConfig) {
    super(config.customPrompt, config.hasCustomPrompt);
    this.config = config;
  }

  protected async enhance(rawText: string): Promise<string> {
    const slog = log.scope(this.providerName);
    const url = "https://api.anthropic.com/v1/messages";

    const requestBody = {
      model: this.config.model,
      system: this.config.customPrompt,
      messages: [
        { role: "user", content: rawText },
      ],
      temperature: 0.1,
      max_tokens: 4096,
    };

    slog.debug("Request body", requestBody);

    const response = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.apiKey,
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

}
