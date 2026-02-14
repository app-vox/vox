import { create } from "zustand";

export interface DevOverrides {
  enabled: boolean;

  // UX-facing states (prioritized)
  updateStatus?: "idle" | "checking" | "available" | "downloading" | "ready" | "error";
  updateDownloadProgress?: number;
  microphonePermission?: "granted" | "denied" | "not-determined";
  accessibilityPermission?: boolean;
  setupComplete?: boolean;
  online?: boolean;

  // Recording / Pipeline
  shortcutState?: "idle" | "hold" | "toggle" | "processing";
  isRecording?: boolean;
  indicatorVisible?: boolean;
  indicatorMode?: "initializing" | "listening" | "transcribing" | "enhancing" | "error" | "canceled" | null;

  // Tray
  trayIsListening?: boolean;
  trayHasModel?: boolean;

  // LLM
  llmEnhancementEnabled?: boolean;
  llmConnectionTested?: boolean;
}

interface DevOverridesState {
  overrides: DevOverrides;
  setEnabled: (enabled: boolean) => void;
  setOverride: <K extends keyof DevOverrides>(key: K, value: DevOverrides[K]) => void;
  clearOverride: (key: keyof DevOverrides) => void;
  clearAll: () => void;
}

const STORAGE_KEY = "vox:dev-overrides";

function loadOverrides(): DevOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DevOverrides;
  } catch { /* ignore */ }
  return { enabled: false };
}

function saveOverrides(overrides: DevOverrides) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch { /* ignore */ }
}

export const useDevOverrides = create<DevOverridesState>((set) => ({
  overrides: loadOverrides(),
  setEnabled: (enabled) =>
    set((s) => {
      const next = { ...s.overrides, enabled };
      saveOverrides(next);
      return { overrides: next };
    }),
  setOverride: (key, value) =>
    set((s) => {
      const next = { ...s.overrides, [key]: value };
      saveOverrides(next);
      return { overrides: next };
    }),
  clearOverride: (key) =>
    set((s) => {
      const next = { ...s.overrides };
      delete next[key];
      saveOverrides(next);
      return { overrides: next };
    }),
  clearAll: () => {
    const fresh: DevOverrides = { enabled: false };
    saveOverrides(fresh);
    return set({ overrides: fresh });
  },
}));

/**
 * Returns the override value if overrides are enabled and the key is set,
 * otherwise returns the real value.
 */
export function useDevValue<K extends keyof DevOverrides>(
  key: K,
  realValue: DevOverrides[K],
): DevOverrides[K] {
  const enabled = useDevOverrides((s) => s.overrides.enabled);
  const override = useDevOverrides((s) => s.overrides[key]);
  if (enabled && override !== undefined) return override;
  return realValue;
}
