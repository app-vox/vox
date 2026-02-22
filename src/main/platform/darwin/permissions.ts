import { systemPreferences, shell, app } from "electron";

export function getAccessibilityStatus(): boolean | string {
  try {
    const koffi = require("koffi");
    const appServices = koffi.load(
      "/System/Library/Frameworks/ApplicationServices.framework/ApplicationServices"
    );
    const AXIsProcessTrusted = appServices.func("AXIsProcessTrusted", "bool", []);
    return AXIsProcessTrusted();
  } catch (err: unknown) {
    return `error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

export function getMicrophoneStatus(): string {
  return systemPreferences.getMediaAccessStatus("microphone");
}

export async function requestMicrophoneAccess(): Promise<boolean> {
  app.focus({ steal: true });
  return systemPreferences.askForMediaAccess("microphone");
}

export function openAccessibilitySettings(): void {
  shell.openExternal(
    "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
  );
}
