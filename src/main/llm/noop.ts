import { type LlmProvider } from "./provider";

/**
 * No-op LLM provider that returns raw text unchanged.
 * Used when LLM enhancement is disabled (Whisper-only mode).
 */
export class NoopProvider implements LlmProvider {
  async correct(rawText: string): Promise<string> {
    return rawText;
  }
}
