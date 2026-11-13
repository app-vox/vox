import type { Prompt, VoxConfig } from "./config";

/** The active prompt, or null when None is active or the active id is not in the list. */
export function findActivePrompt(config: VoxConfig): Prompt | null {
  return config.prompts.find((prompt) => prompt.id === config.activePromptId) ?? null;
}

/** A prompt as the tray, HUD and notifications show it: its icon, if any, then its name. */
export function promptLabel(prompt: Prompt): string {
  return prompt.icon ? `${prompt.icon} ${prompt.name}` : prompt.name;
}

/** The active prompt's trimmed instructions, or null when None, unknown or blank. */
export function activeInstructions(config: VoxConfig): string | null {
  return findActivePrompt(config)?.instructions.trim() || null;
}

/** The id after the active one in the cycle None → list order → None; an unknown id counts as None. */
export function nextPromptId(config: VoxConfig): string | null {
  const index = config.prompts.findIndex((prompt) => prompt.id === config.activePromptId);
  return config.prompts[index + 1]?.id ?? null;
}
