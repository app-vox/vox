const isDev = process.env.NODE_ENV === "development";

export function logLlmRequest(
  providerName: string,
  rawText: string,
  customPrompt: string,
  hasCustomPrompt: boolean,
): void {
  console.log(`[${providerName}] Enhancing text, custom prompt:`, hasCustomPrompt ? "YES" : "NO");
  if (isDev) {
    console.log(`[${providerName}] [DEV] Raw text length:`, rawText.length);
    console.log(`[${providerName}] [DEV] Raw text:`, rawText);
    console.log(`[${providerName}] [DEV] System prompt:`, customPrompt);
  }
}

export function logLlmResponse(
  providerName: string,
  rawText: string,
  correctedText: string,
): void {
  console.log(`[${providerName}] Enhanced text:`, correctedText);
  if (isDev) {
    console.log(`[${providerName}] [DEV] Enhanced text length:`, correctedText.length);
    console.log(`[${providerName}] [DEV] Character diff:`, correctedText.length - rawText.length);
  }
}
