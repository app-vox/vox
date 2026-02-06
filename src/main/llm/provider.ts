export interface LlmProvider {
  correct(rawText: string): Promise<string>;
}
