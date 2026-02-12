import { type LlmProvider } from "./provider";
import { logLlmRequest, logLlmResponse } from "./logging";

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

export class FoundryProvider implements LlmProvider {
  private readonly config: FoundryConfig;

  constructor(config: FoundryConfig) {
    this.config = config;
  }

  async correct(rawText: string): Promise<string> {
    const isDev = process.env.NODE_ENV === "development";

    logLlmRequest("FoundryProvider", rawText, this.config.customPrompt, this.config.hasCustomPrompt);

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

    if (isDev) {
      console.log("[FoundryProvider] [DEV] Request body:", JSON.stringify(requestBody, null, 2));
    }

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

    const correctedText = textBlock.text.trim();
    logLlmResponse("FoundryProvider", rawText, correctedText);

    return correctedText;
  }
}
