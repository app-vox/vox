import { create } from "zustand";
import type { PermissionsStatus, KeychainStatus } from "../../preload/index";

interface PermissionsState {
  status: PermissionsStatus | null;
  keychainStatus: KeychainStatus | null;
  refresh: () => Promise<void>;
  requestMicrophone: () => Promise<void>;
  requestAccessibility: () => Promise<void>;
}

export const usePermissionsStore = create<PermissionsState>((set, get) => ({
  status: null,
  keychainStatus: null,

  refresh: async () => {
    const [s, ks] = await Promise.all([
      window.voxApi.permissions.status(),
      window.voxApi.permissions.keychainStatus(),
    ]);
    set({ status: s, keychainStatus: ks });
  },

  requestMicrophone: async () => {
    await window.voxApi.permissions.requestMicrophone();
    await get().refresh();
  },

  requestAccessibility: async () => {
    await window.voxApi.permissions.requestAccessibility();
  },
}));
