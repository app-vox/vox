import log from "electron-log/main";
import type { PermissionsModule } from "../types";

const slog = log.scope("Permissions");

export const getAccessibilityStatus: PermissionsModule["getAccessibilityStatus"] = () => {
  return true;
};

export const getMicrophoneStatus: PermissionsModule["getMicrophoneStatus"] = () => {
  return "granted";
};

export const requestMicrophoneAccess: PermissionsModule["requestMicrophoneAccess"] = () => {
  return Promise.resolve(true);
};

export const openAccessibilitySettings: PermissionsModule["openAccessibilitySettings"] = () => {
  slog.info("Accessibility settings not applicable on Linux");
};
