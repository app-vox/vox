import log from "electron-log/main";
import type { LlmProvider } from "./provider";

export abstract class BaseLlmProvider implements LlmProvider {
  protected abstract readonly providerName: string;
  protected readonly customPromptText: string;
  protected readonly customPromptEnabled: boolean;

  constructor(customPrompt: string, hasCustomPrompt: boolean) {
    this.customPromptText = customPrompt;
    this.customPromptEnabled = hasCustomPrompt;
  }

  async correct(rawText: string): Promise<string> {
    const slog = log.scope(this.providerName);
    slog.info("Enhancing text", { hasCustomPrompt: this.customPromptEnabled });
    slog.debug("Request details", {
      rawTextLength: rawText.length,
      rawText,
      systemPrompt: this.customPromptText,
    });

    const correctedText = await this.enhance(rawText);

    slog.info("Enhanced text", { correctedText });
    slog.debug("Response stats", {
      length: correctedText.length,
      charDiff: correctedText.length - rawText.length,
    });
    return correctedText;
  }

  protected abstract enhance(rawText: string): Promise<string>;
}
