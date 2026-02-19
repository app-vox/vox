import { useState, useCallback } from "react";
import type { TranscribeResult } from "../../preload/index";

export function useTranscriptionTest(defaultDuration = 3) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TranscribeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (duration?: number): Promise<TranscribeResult | null> => {
    setTesting(true);
    setResult(null);
    setError(null);
    try {
      const secs = typeof duration === "number" ? duration : defaultDuration;
      const text = await window.voxApi.whisper.test(secs);
      if (text) {
        const transcribeResult: TranscribeResult = { rawText: text, correctedText: null, llmError: null };
        setResult(transcribeResult);
        return transcribeResult;
      } else {
        setError("no-speech");
        return null;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setTesting(false);
    }
  }, [defaultDuration]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { testing, result, error, run, reset };
}
