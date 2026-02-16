import log from "electron-log/main";
import { BaseLlmProvider } from "./base-provider";
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

export class CustomProvider extends BaseLlmProvider {
  protected readonly providerName = "Custom";
  private readonly config: CustomProviderConfig;

  constructor(config: CustomProviderConfig) {
    super(config.customPrompt, config.hasCustomPrompt);
    this.config = config;
  }

  protected async enhance(rawText: string): Promise<string> {
    const slog = log.scope(this.providerName);
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

    slog.debug("Custom request", {
      url,
      tokenSendAs: this.config.tokenSendAs,
      body,
    });

    const response = await fetch(url, {
      method: "POST",
      cache: "no-store",
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

    return content.trim();
  }

}
