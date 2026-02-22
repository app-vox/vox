export function applyCase(text: string, lowercaseStart: boolean, forceCapitalize = false): string {
  if (!text) return text;
  if (lowercaseStart && !forceCapitalize) return text[0].toLowerCase() + text.slice(1);
  return text;
}

export function stripTrailingPeriod(text: string): string {
  if (!text.endsWith(".")) return text;
  const words = text.trim().split(/\s+/);
  if (words.length <= 3) return text.slice(0, -1);
  return text;
}
