import { create } from "zustand";

export interface DevOverrides {
  enabled: boolean;
  microphonePermission?: "granted" | "denied" | "not-determined";
  accessibilityPermission?: boolean;
  whisperModel?: string;
  llmProvider?: string;
  llmEnhancementEnabled?: boolean;
  shortcutState?: "idle" | "hold" | "toggle" | "processing";
  isRecording?: boolean;
  indicatorVisible?: boolean;
  indicatorMode?: "initializing" | "listening" | "transcribing" | "enhancing" | "error" | "canceled" | null;
  trayIsListening?: boolean;
  trayHasModel?: boolean;
  updateStatus?: "idle" | "checking" | "available" | "downloading" | "ready" | "error";
  setupComplete?: boolean;
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
