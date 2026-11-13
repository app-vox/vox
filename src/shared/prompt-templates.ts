/** A starting point for a new prompt; the name is an i18n key, the instructions stay in English. */
export interface PromptTemplate {
  id: string;
  nameKey: string;
  icon: string;
  instructions: string;
}

export const PROMPT_TEMPLATES: readonly PromptTemplate[] = [
  {
    id: "translate-pt",
    nameKey: "llm.prompts.template.translatePortuguese",
    icon: "🇧🇷",
    instructions: "Translate the text into Brazilian Portuguese. Output only the translation, keeping the original meaning, tone and formatting.",
  },
  {
    id: "translate-de",
    nameKey: "llm.prompts.template.translateGerman",
    icon: "🇩🇪",
    instructions: "Translate the text into German. Output only the translation, keeping the original meaning, tone and formatting.",
  },
  {
    id: "translate-en",
    nameKey: "llm.prompts.template.translateEnglish",
    icon: "🇬🇧",
    instructions: "Translate the text into English. Output only the translation, keeping the original meaning, tone and formatting.",
  },
];
