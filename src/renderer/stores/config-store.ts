import { create } from "zustand";
import type { VoxConfig } from "../../shared/config";
import { useSaveToast } from "../hooks/use-save-toast";

interface ConfigState {
  config: VoxConfig | null;
  loading: boolean;
  activeTab: string;
  setupComplete: boolean;
  setActiveTab: (tab: string) => void;
  loadConfig: () => Promise<void>;
  updateConfig: (partial: Partial<VoxConfig>) => void;
  saveConfig: (showToast?: boolean) => Promise<void>;
  checkSetup: () => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: null,
  loading: true,
  activeTab: typeof window !== "undefined" ? (localStorage.getItem("vox:activeTab") || "whisper") : "whisper",
  setupComplete: false,

  setActiveTab: (tab) => {
    set({ activeTab: tab });
    if (typeof window !== "undefined") {
      localStorage.setItem("vox:activeTab", tab);
    }
  },

  loadConfig: async () => {
    set({ loading: true });
    const config = await window.voxApi.config.load();

    // Check setup state
    const setupState = await window.voxApi.setup.check();

    // Force Whisper tab if setup is incomplete
    const savedTab = typeof window !== "undefined" ? localStorage.getItem("vox:activeTab") : null;
    const activeTab = setupState.hasAnyModel ? (savedTab || "whisper") : "whisper";

    set({
      config,
      loading: false,
      activeTab,
      setupComplete: setupState.hasAnyModel,
    });
  },

  updateConfig: (partial) => {
    const current = get().config;
    if (!current) return;
    set({
      config: {
        ...current,
        ...partial,
        llm: { ...current.llm, ...(partial.llm ?? {}) },
        whisper: { ...current.whisper, ...(partial.whisper ?? {}) },
        shortcuts: { ...current.shortcuts, ...(partial.shortcuts ?? {}) },
      },
    });
  },

  saveConfig: async (showToast = false) => {
    const config = get().config;
    if (!config) return;
    await window.voxApi.config.save(config);
    await window.voxApi.shortcuts.enable();
    if (showToast) {
      useSaveToast.getState().trigger();
    }
    // Re-check setup state after saving
    await get().checkSetup();
  },

  checkSetup: async () => {
    const setupState = await window.voxApi.setup.check();
    set({ setupComplete: setupState.hasAnyModel });
  },
}));
