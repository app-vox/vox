import { type LlmProvider } from "./provider";
import { logLlmRequest, logLlmResponse } from "./logging";
import type { CustomTokenSendAs } from "../../shared/config";

export interface CustomProviderConfig {
  endpoint: string;
  token: string;
  tokenAttr: string;
  tokenSendAs: CustomTokenSendAs;
  model: string;
  customPrompt: string;
  hasCustomPrompt: boolean;
}

interface ChatCompletionResponse {
  choices: { message: { content: string } }[];
}

export class CustomProvider implements LlmProvider {
  private readonly config: CustomProviderConfig;

  constructor(config: CustomProviderConfig) {
    this.config = config;
  }

  async correct(rawText: string): Promise<string> {
    const isDev = process.env.NODE_ENV === "development";

    logLlmRequest("CustomProvider", rawText, this.config.customPrompt, this.config.hasCustomPrompt);

    let url = this.config.endpoint.replace(/\/+$/, "");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const body: Record<string, unknown> = {
      messages: [
        { role: "system", content: this.config.customPrompt },
        { role: "user", content: rawText },
      ],
      temperature: 0.1,
      max_tokens: 4096,
    };

    if (this.config.model) {
      body.model = this.config.model;
    }

    if (this.config.token && this.config.tokenAttr) {
      switch (this.config.tokenSendAs) {
        case "header":
          headers[this.config.tokenAttr] = this.config.token;
          break;
        case "body":
          body[this.config.tokenAttr] = this.config.token;
          break;
        case "query": {
          const separator = url.includes("?") ? "&" : "?";
          url = `${url}${separator}${encodeURIComponent(this.config.tokenAttr)}=${encodeURIComponent(this.config.token)}`;
          break;
        }
      }
    }

    if (isDev) {
      console.log("[CustomProvider] [DEV] URL:", url);
      console.log("[CustomProvider] [DEV] Send as:", this.config.tokenSendAs);
      console.log("[CustomProvider] [DEV] Request body:", JSON.stringify(body, null, 2));
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const responseBody = await response.text();
      throw new Error(`LLM request failed: ${response.status} ${response.statusText} — ${responseBody}`);
    }

    const data = await response.json() as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("LLM returned no text content");
    }

    const correctedText = content.trim();
    logLlmResponse("CustomProvider", rawText, correctedText);

    return correctedText;
  }
}
