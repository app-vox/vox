import { useCallback, useRef } from "react";
import { useConfigStore } from "../stores/config-store";

export function useDebouncedSave(delayMs = 500) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveConfig = useConfigStore((s) => s.saveConfig);

  return useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => saveConfig(), delayMs);
  }, [saveConfig, delayMs]);
}
