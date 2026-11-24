/** The text of whisper-cli's output: its timestamped lines, joined by one space. */
export function parseWhisperOutput(output: string): string {
  // Match lines like: [00:00:00.000 --> 00:00:03.000]   Testando para ver se funciona
  const lines = output.match(/\[\d{2}:\d{2}:\d{2}\.\d{3}\s-->\s\d{2}:\d{2}:\d{2}\.\d{3}\]\s+.+/g);
  if (!lines) return "";

  return lines
    .map((line) => {
      const match = line.match(/\]\s+(.+)/);
      return match ? match[1].trim() : "";
    })
    .filter(Boolean)
    .join(" ")
    .trim();
}

/** The language code whisper-cli reports for a pass that ran with `auto`, or null when it reports none. */
export function parseDetectedLanguage(output: string): string | null {
  // Match a line like: whisper_full_with_state: auto-detected language: pt (p = 0.980138)
  const match = output.match(/auto-detected language: ([a-z]+)/i);
  return match ? match[1] : null;
}
