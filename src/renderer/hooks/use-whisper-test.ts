import { useState, useCallback } from "react";
import { recordAudio } from "../utils/record-audio";

interface UseWhisperTestOptions {
  onSuccess?: (text: string) => void;
}

export function useWhisperTest(options?: UseWhisperTestOptions) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const runTest = useCallback(async (durationSeconds: number) => {
    setTesting(true);
    setTestResult(null);
    setTestError(null);

    try {
      const recording = await recordAudio(durationSeconds);
      const text = await window.voxApi.whisper.test(recording);
      if (text) {
        setTestResult(text);
        options?.onSuccess?.(text);
      } else {
        setTestError("no-speech");
      }
    } catch (err: unknown) {
      setTestError(err instanceof Error ? err.message : String(err));
    } finally {
      setTesting(false);
    }
  }, [options]);

  return { testing, testResult, testError, runTest, setTestResult, setTestError };
}
