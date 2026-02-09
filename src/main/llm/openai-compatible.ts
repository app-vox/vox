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
    console.log("[OpenAICompatibleProvider] Enhancing text, custom prompt:", hasCustom ? "YES" : "NO");

    const base = this.config.endpoint.replace(/\/+$/, "");
    const url = `${base}/v1/chat/completions`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: "system", content: this.config.customPrompt },
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

    const data = await response.json() as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("LLM returned no text content");
    }
    return content.trim();
  }
}
