import { create } from "zustand";
import type { VoxConfig } from "../../shared/config";
import { useSaveToast } from "../hooks/use-save-toast";

function migrateActiveTab(tab: string | null): string | null {
  if (tab === "appearance") return "general";
  if (tab === "history") return "transcriptions";
  return tab;
}

interface ConfigState {
  config: VoxConfig | null;
  loading: boolean;
  activeTab: string;
  setupComplete: boolean;
  _hasSavedTab: boolean;
  _hasUserNavigated: boolean;
  setActiveTab: (tab: string) => void;
  loadConfig: () => Promise<void>;
  updateConfig: (partial: Partial<VoxConfig>) => void;
  saveConfig: (showToast?: boolean) => Promise<void>;
  checkSetup: () => Promise<void>;
}

const _savedTab = typeof window !== "undefined" ? migrateActiveTab(localStorage.getItem("vox:activeTab")) : null;

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: null,
  loading: true,
  activeTab: _savedTab || "general",
  setupComplete: false,
  _hasSavedTab: _savedTab !== null,
  _hasUserNavigated: false,

  setActiveTab: (tab) => {
    set({ activeTab: tab, _hasUserNavigated: true });
    if (typeof window !== "undefined") {
      localStorage.setItem("vox:activeTab", tab);
    }
  },

  loadConfig: async () => {
    set({ loading: true });
    const config = await window.voxApi.config.load();

    const setupState = await window.voxApi.setup.check();
    const { _hasUserNavigated, _hasSavedTab } = get();

    const updates: Partial<ConfigState> = {
      config,
      loading: false,
      setupComplete: setupState.hasAnyModel,
    };

    if (!_hasUserNavigated && !_hasSavedTab) {
      updates.activeTab = setupState.hasAnyModel ? "transcriptions" : "general";
    }

    set(updates as ConfigState);
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
