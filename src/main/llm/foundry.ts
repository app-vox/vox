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
    const isDev = process.env.NODE_ENV === "development";

    console.log("[FoundryProvider] Enhancing text, custom prompt:", hasCustom ? "YES" : "NO");
    if (isDev) {
      console.log("[FoundryProvider] [DEV] Raw text length:", rawText.length);
      console.log("[FoundryProvider] [DEV] Raw text:", rawText);
      console.log("[FoundryProvider] [DEV] System prompt:", this.config.customPrompt);
    }

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
    console.log("[FoundryProvider] Enhanced text:", correctedText);
    if (isDev) {
      console.log("[FoundryProvider] [DEV] Enhanced text length:", correctedText.length);
      console.log("[FoundryProvider] [DEV] Character diff:", correctedText.length - rawText.length);
    }

    return correctedText;
  }
}
