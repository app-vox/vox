import log from "electron-log/main";
import type { LlmProvider } from "./provider";

export abstract class BaseLlmProvider implements LlmProvider {
  protected abstract readonly providerName: string;

  async correct(rawText: string): Promise<string> {
    const slog = log.scope(this.providerName);
    slog.info("Enhancing text", { hasCustomPrompt: this.hasCustomPrompt() });
    slog.debug("Request details", {
      rawTextLength: rawText.length,
      rawText,
      systemPrompt: this.getCustomPrompt(),
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
  protected abstract hasCustomPrompt(): boolean;
  protected abstract getCustomPrompt(): string;
}
