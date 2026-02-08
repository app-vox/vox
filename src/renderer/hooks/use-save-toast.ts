import { create } from "zustand";

interface SaveToastState {
  show: boolean;
  trigger: () => void;
  hide: () => void;
}

export const useSaveToast = create<SaveToastState>((set) => ({
  show: false,
  trigger: () => set({ show: true }),
  hide: () => set({ show: false }),
}));
