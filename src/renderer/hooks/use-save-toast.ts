import { create } from "zustand";

interface SaveToastState {
  show: boolean;
  timestamp: number;
  trigger: () => void;
  hide: () => void;
}

export const useSaveToast = create<SaveToastState>((set) => ({
  show: false,
  timestamp: 0,
  trigger: () => set({ show: true, timestamp: Date.now() }),
  hide: () => set({ show: false }),
}));
