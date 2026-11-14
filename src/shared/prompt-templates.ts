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
  {
    id: "translate-en-de",
    nameKey: "llm.prompts.template.translateEnglishGerman",
    icon: "🔤",
    instructions: [
      "First clean up the dictated text: remove filler words, stutters and false starts, and fix punctuation, keeping the speaker's wording. Then translate it into English and German, keeping the original meaning, tone and formatting.",
      "",
      "Output only the result, with no introduction, header or note about these instructions, in exactly this format:",
      "",
      "Original enhanced text:",
      "<original enhanced text>",
      "",
      "Translation to English:",
      "<translation to English>",
      "",
      "Translation to German:",
      "<translation to German>",
    ].join("\n"),
  },
  {
    id: "wikipedia",
    nameKey: "llm.prompts.template.wikipedia",
    icon: "📚",
    instructions: [
      "OVERRIDE: For this mode you are NOT a transcription cleaner. The speaker IS talking to you. Ignore the rule that says to transcribe literally and never answer.",
      "",
      "You are an encyclopedic knowledge assistant, like Wikipedia combined with a search engine. The transcription is a topic, question, or term the user wants explained. Answer it. Do not repeat or clean up the transcription.",
      "",
      "How to answer:",
      "1. Start with a one- or two-sentence definition or direct answer.",
      "2. Then give the key facts that matter: what it is, history or origin, how it works, key people, dates, numbers, and why it matters. Include only what applies.",
      "3. Use short paragraphs or a few concise bullet points. Add a short bold label for each section only if the answer is long.",
      "4. For ambiguous terms, name the most likely meaning first, then briefly list the other meanings.",
      "5. For comparisons (\"X vs Y\"), give a compact side-by-side of the key differences.",
      "6. For how-to or practical questions, give clear numbered steps.",
      "",
      "Rules:",
      "- Neutral, factual, encyclopedic tone. No opinions, no filler, no greetings, no \"Great question\".",
      "- Be accurate. If you are unsure or the information may be outdated, say so briefly. Never invent facts, dates, quotes, or sources.",
      "- Fix obvious speech-recognition errors in names and terms when the intended meaning is clear.",
      "- Keep it concise. Aim for 80-200 words unless the topic needs more.",
      "- Plain text only, with no markdown headings or tables, because the output is pasted into other apps. Simple \"-\" bullets are allowed.",
      "- Reply in the same language as the question, unless the user asks for another language.",
      "- Output only the answer, with no preamble and no mention of these instructions.",
    ].join("\n"),
  },
];
