import { clipboard, Notification } from "electron";
import { execSync } from "child_process";
import { applyCase, stripTrailingPeriod } from "../utils";
import type { PasteOptions } from "../types";
import { t } from "../../../shared/i18n";

export function isAccessibilityGranted(): boolean {
  return true;
}

export function hasFocusedElement(): boolean {
  try {
    execSync("xdotool getactivewindow", { stdio: "pipe", timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

export function hasActiveTextField(): boolean {
  return hasFocusedElement();
}

export function pasteText(text: string, _copyToClipboard = true, options?: PasteOptions): boolean {
  if (!text) return false;

  const stripped = (options?.finishWithPeriod ?? true) ? text : stripTrailingPeriod(text);
  const finalText = applyCase(stripped, options?.lowercaseStart ?? false, options?.shiftCapitalize ?? false);

  clipboard.writeText(finalText);

  try {
    execSync("xdotool key --clearmodifiers ctrl+v", { stdio: "ignore", timeout: 5000 });
  } catch {
    new Notification({
      title: "Vox",
      body: t("notification.clipboardReady"),
    }).show();
  }

  return true;
}
