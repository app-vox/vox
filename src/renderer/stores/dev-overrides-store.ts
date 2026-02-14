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

const DEFAULT_OVERRIDES: DevOverrides = { enabled: false };

export const useDevOverrides = create<DevOverridesState>((set) => ({
  overrides: { ...DEFAULT_OVERRIDES },
  setEnabled: (enabled) =>
    set((s) => ({ overrides: { ...s.overrides, enabled } })),
  setOverride: (key, value) =>
    set((s) => ({ overrides: { ...s.overrides, [key]: value } })),
  clearOverride: (key) =>
    set((s) => {
      const next = { ...s.overrides };
      delete next[key];
      return { overrides: next };
    }),
  clearAll: () => set({ overrides: { ...DEFAULT_OVERRIDES } }),
}));
