import { clipboard, Notification } from "electron";
import { execSync } from "child_process";

export function pasteText(text: string): void {
  if (!text) return;

  clipboard.writeText(text);

  try {
    // Simulate Cmd+V using AppleScript — requires Accessibility permission
    execSync(
      'osascript -e \'tell application "System Events" to keystroke "v" using command down\'',
      { timeout: 3000 }
    );
  } catch {
    new Notification({
      title: "Vox",
      body: "Auto-paste failed. Grant Accessibility access to Electron in System Settings. Text is on your clipboard — press Cmd+V.",
    }).show();
  }
}
