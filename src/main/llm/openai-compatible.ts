import log from "electron-log/main";
import { BaseLlmProvider } from "./base-provider";

export interface OpenAICompatibleConfig {
  endpoint: string;
  apiKey: string;
  model: string;
  customPrompt: string;
  hasCustomPrompt: boolean;
}

interface ChatCompletionResponse {
  choices: { message: { content: string } }[];
}

export class OpenAICompatibleProvider extends BaseLlmProvider {
  protected readonly providerName = "OpenAICompatible";
  private readonly config: OpenAICompatibleConfig;

  constructor(config: OpenAICompatibleConfig) {
    super();
    this.config = config;
  }

  protected async enhance(rawText: string): Promise<string> {
    const slog = log.scope(this.providerName);
    const base = this.config.endpoint.replace(/\/+$/, "");
    const url = `${base}/v1/chat/completions`;

    const requestBody = {
      model: this.config.model,
      messages: [
        { role: "system", content: this.config.customPrompt },
        { role: "user", content: rawText },
      ],
      temperature: 0.1,
      max_tokens: 4096,
    };

    slog.debug("Request body", requestBody);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`LLM request failed: ${response.status} ${response.statusText} — ${body}`);
    }

    const data = await response.json() as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("LLM returned no text content");
    }

    return content.trim();
  }

  protected hasCustomPrompt(): boolean {
    return this.config.hasCustomPrompt;
  }

  protected getCustomPrompt(): string {
    return this.config.customPrompt;
  }
}
