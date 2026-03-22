export const Tabs = {
  GENERAL: "general",
  SPEECH: "whisper",
  AI_ENHANCEMENT: "llm",
  DICTIONARY: "dictionary",
  TRANSCRIPTIONS: "transcriptions",
  PERMISSIONS: "permissions",
  SHORTCUTS: "shortcuts",
  ABOUT: "about",
  DEV: "dev",
  ONBOARDING: "onboarding",
} as const;

export type TabId = (typeof Tabs)[keyof typeof Tabs];
