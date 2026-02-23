import { create } from "zustand";

export interface DevOverrides {
  enabled: boolean;

  // UX-facing states — these actually affect the renderer UI
  updateStatus?: "idle" | "checking" | "available" | "downloading" | "ready" | "error";
  updateDownloadProgress?: number;
  microphonePermission?: "granted" | "denied" | "not-determined";
  accessibilityPermission?: boolean;
  copyToClipboard?: boolean;
  setupComplete?: boolean;
  online?: boolean;
  llmEnhancementEnabled?: boolean;
  llmConnectionTested?: boolean;
  llmProviderConfigured?: boolean;
  analyticsDevEnabled?: boolean;
  hideDevVisuals?: boolean;
  visitedShortcuts?: boolean;
  reduceAnimations?: boolean;
  reduceVisualEffects?: boolean;
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
    window.dispatchEvent(new CustomEvent("vox:dev-overrides-changed"));
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
