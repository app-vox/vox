import { create } from "zustand";
import type { VoxConfig } from "../../shared/config";
import { useSaveToast } from "../hooks/use-save-toast";

interface ConfigState {
  config: VoxConfig | null;
  loading: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  loadConfig: () => Promise<void>;
  updateConfig: (partial: Partial<VoxConfig>) => void;
  saveConfig: (showToast?: boolean) => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: null,
  loading: true,
  activeTab: "whisper",

  setActiveTab: (tab) => set({ activeTab: tab }),

  loadConfig: async () => {
    set({ loading: true });
    const config = await window.voxApi.config.load();
    set({ config, loading: false });
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
  },
}));
