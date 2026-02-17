import { create } from "zustand";

export type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface OnboardingState {
  step: OnboardingStep;
  forceOpen: boolean;

  setStep: (step: OnboardingStep) => void;
  setForceOpen: (v: boolean) => void;
  next: () => void;
  back: () => void;
  reset: () => void;
}

const MAX_STEP: OnboardingStep = 7;

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  step: 0,
  forceOpen: false,

  setStep: (step) => set({ step }),
  setForceOpen: (v) => set({ forceOpen: v }),
  next: () => {
    const { step } = get();
    if (step < MAX_STEP) set({ step: (step + 1) as OnboardingStep });
  },
  back: () => {
    const { step } = get();
    if (step > 0) set({ step: (step - 1) as OnboardingStep });
  },
  reset: () => set({
    step: 0,
    forceOpen: false,
  }),
}));
