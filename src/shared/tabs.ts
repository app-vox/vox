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
  /** Navigation value: the AI Enhancement tab, on the Custom Prompt sub-tab when AI enhancement is on. */
  PROMPT_SETTINGS: "prompt-settings",
} as const;

export type TabId = (typeof Tabs)[keyof typeof Tabs];
