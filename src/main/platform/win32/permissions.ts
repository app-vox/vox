import { systemPreferences, shell, app } from "electron";

export function getAccessibilityStatus(): boolean | string {
  // Windows has no accessibility permission gate — always granted
  return true;
}

export function getMicrophoneStatus(): string {
  return systemPreferences.getMediaAccessStatus("microphone");
}

export async function requestMicrophoneAccess(): Promise<boolean> {
  app.focus({ steal: true });
  return systemPreferences.askForMediaAccess("microphone");
}

export function openAccessibilitySettings(): void {
  shell.openExternal("ms-settings:privacy-microphone");
}
