import { type LlmProvider } from "./provider";

export interface OpenAICompatibleConfig {
  endpoint: string;
  apiKey: string;
  model: string;
  customPrompt: string;
}

interface ChatCompletionResponse {
  choices: { message: { content: string } }[];
}

export class OpenAICompatibleProvider implements LlmProvider {
  private readonly config: OpenAICompatibleConfig;

  constructor(config: OpenAICompatibleConfig) {
    this.config = config;
  }

  async correct(rawText: string): Promise<string> {
    const hasCustom = this.config.customPrompt.includes("ADDITIONAL CUSTOM INSTRUCTIONS");
    const isDev = process.env.NODE_ENV === "development";

    console.log("[OpenAICompatibleProvider] Enhancing text, custom prompt:", hasCustom ? "YES" : "NO");
    if (isDev) {
      console.log("[OpenAICompatibleProvider] [DEV] Raw text length:", rawText.length);
      console.log("[OpenAICompatibleProvider] [DEV] Raw text:", rawText);
      console.log("[OpenAICompatibleProvider] [DEV] System prompt:", this.config.customPrompt);
    }

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

    if (isDev) {
      console.log("[OpenAICompatibleProvider] [DEV] Request body:", JSON.stringify(requestBody, null, 2));
    }

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

    const correctedText = content.trim();
    console.log("[OpenAICompatibleProvider] Enhanced text:", correctedText);
    if (isDev) {
      console.log("[OpenAICompatibleProvider] [DEV] Enhanced text length:", correctedText.length);
      console.log("[OpenAICompatibleProvider] [DEV] Character diff:", correctedText.length - rawText.length);
    }

    return correctedText;
  }
}
