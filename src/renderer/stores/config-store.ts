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
  activeTab: typeof window !== "undefined" ? (localStorage.getItem("vox:activeTab") || "whisper") : "whisper",

  setActiveTab: (tab) => {
    set({ activeTab: tab });
    if (typeof window !== "undefined") {
      localStorage.setItem("vox:activeTab", tab);
    }
  },

  loadConfig: async () => {
    set({ loading: true });
    const config = await window.voxApi.config.load();
    // Restore active tab from localStorage
    const savedTab = typeof window !== "undefined" ? localStorage.getItem("vox:activeTab") : null;
    set({ config, loading: false, activeTab: savedTab || "whisper" });
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
