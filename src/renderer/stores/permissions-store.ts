import { create } from "zustand";
import type { PermissionsStatus } from "../../preload/index";

interface PermissionsState {
  status: PermissionsStatus | null;
  refresh: () => Promise<void>;
  requestMicrophone: () => Promise<void>;
  requestAccessibility: () => Promise<void>;
}

export const usePermissionsStore = create<PermissionsState>((set, get) => ({
  status: null,

  refresh: async () => {
    const s = await window.voxApi.permissions.status();
    set({ status: s });
  },

  requestMicrophone: async () => {
    await window.voxApi.permissions.requestMicrophone();
    await get().refresh();
  },

  requestAccessibility: async () => {
    await window.voxApi.permissions.requestAccessibility();
  },
}));
