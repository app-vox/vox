import { create } from "zustand";
import type { VoxConfig } from "../../shared/config";
import { useSaveToast } from "../hooks/use-save-toast";
import { Tabs } from "../../shared/tabs";

export function migrateActiveTab(tab: string | null): string | null {
  if (tab === "appearance") return Tabs.GENERAL;
  if (tab === "history") return Tabs.TRANSCRIPTIONS;
  return tab;
}

/** The sub-tab shown in the AI Enhancement tab. */
export type LlmSubTab = "provider" | "prompt";

interface ConfigState {
  config: VoxConfig | null;
  loading: boolean;
  activeTab: string;
  llmSubTab: LlmSubTab;
  setupComplete: boolean;
  _hasSavedTab: boolean;
  _hasUserNavigated: boolean;
  setActiveTab: (tab: string) => void;
  setLlmSubTab: (tab: LlmSubTab) => void;
  /** Shows the AI Enhancement tab, on the Custom Prompt sub-tab when AI enhancement is on. */
  openPromptSettings: () => Promise<void>;
  loadConfig: () => Promise<void>;
  updateConfig: (partial: Partial<VoxConfig>) => void;
  saveConfig: (showToast?: boolean) => Promise<void>;
  checkSetup: () => Promise<void>;
}

const _savedTab = typeof window !== "undefined" ? migrateActiveTab(localStorage.getItem("vox:activeTab")) : null;

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: null,
  loading: true,
  activeTab: _savedTab || Tabs.GENERAL,
  llmSubTab: "provider",
  setupComplete: false,
  _hasSavedTab: _savedTab !== null,
  _hasUserNavigated: false,

  setActiveTab: (tab) => {
    set({ activeTab: tab, _hasUserNavigated: true });
    if (typeof window !== "undefined") {
      localStorage.setItem("vox:activeTab", tab);
    }
  },

  setLlmSubTab: (tab) => set({ llmSubTab: tab }),

  openPromptSettings: async () => {
    get().setActiveTab(Tabs.AI_ENHANCEMENT);
    // A window that has just opened gets this navigation before its first config load.
    const config = get().config ?? (await window.voxApi.config.load());
    if (config.enableLlmEnhancement) set({ llmSubTab: "prompt" });
  },

  loadConfig: async () => {
    const config = await window.voxApi.config.load();

    const setupState = await window.voxApi.setup.check();
    const { _hasUserNavigated, _hasSavedTab } = get();

    const updates: Partial<ConfigState> = {
      config,
      loading: false,
      setupComplete: setupState.hasAnyModel,
    };

    if (!_hasUserNavigated && !_hasSavedTab) {
      updates.activeTab = setupState.hasAnyModel ? Tabs.TRANSCRIPTIONS : Tabs.GENERAL;
    }

    set(updates as ConfigState);
  },

  updateConfig: (partial) => {
    const current = get().config;
    if (!current) return;
    // When switching providers, replace llm entirely to maintain discriminated union invariant.
    // When updating fields within the same provider, merge as before.
    const llm = partial.llm
      ? partial.llm.provider !== current.llm.provider
        ? partial.llm
        : { ...current.llm, ...partial.llm }
      : current.llm;
    set({
      config: {
        ...current,
        ...partial,
        llm,
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

if (typeof window !== "undefined" && window.voxApi?.config?.onConfigChanged) {
  window.voxApi.config.onConfigChanged(() => {
    useConfigStore.getState().loadConfig();
  });
}
