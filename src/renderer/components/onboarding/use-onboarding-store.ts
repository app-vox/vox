import { create } from "zustand";

export type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface OnboardingState {
  step: OnboardingStep;
  forceOpen: boolean;
  modelDownloaded: boolean;
  microphoneGranted: boolean;
  accessibilityGranted: boolean;
  testResult: string | null;
  testError: string | null;
  testing: boolean;

  setStep: (step: OnboardingStep) => void;
  setForceOpen: (v: boolean) => void;
  next: () => void;
  back: () => void;
  setModelDownloaded: (v: boolean) => void;
  setMicrophoneGranted: (v: boolean) => void;
  setAccessibilityGranted: (v: boolean) => void;
  setTestResult: (result: string | null) => void;
  setTestError: (error: string | null) => void;
  setTesting: (v: boolean) => void;
  reset: () => void;
}

const MAX_STEP: OnboardingStep = 7;

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  step: 0,
  forceOpen: false,
  modelDownloaded: false,
  microphoneGranted: false,
  accessibilityGranted: false,
  testResult: null,
  testError: null,
  testing: false,

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
  setModelDownloaded: (v) => set({ modelDownloaded: v }),
  setMicrophoneGranted: (v) => set({ microphoneGranted: v }),
  setAccessibilityGranted: (v) => set({ accessibilityGranted: v }),
  setTestResult: (result) => set({ testResult: result }),
  setTestError: (error) => set({ testError: error }),
  setTesting: (v) => set({ testing: v }),
  reset: () => set({
    step: 0,
    forceOpen: false,
    modelDownloaded: false,
    microphoneGranted: false,
    accessibilityGranted: false,
    testResult: null,
    testError: null,
    testing: false,
  }),
}));
