import { clipboard } from "electron";
import { execSync } from "child_process";

export interface PasteAction {
  clipboardText: string;
  shouldPaste: boolean;
}

export function buildPasteSequence(text: string): PasteAction {
  return {
    clipboardText: text,
    shouldPaste: text.length > 0,
  };
}

export function pasteText(text: string): void {
  const action = buildPasteSequence(text);
  if (!action.shouldPaste) return;

  clipboard.writeText(action.clipboardText);

  // Simulate Cmd+V using AppleScript (most reliable cross-app method on macOS)
  execSync(
    'osascript -e \'tell application "System Events" to keystroke "v" using command down\''
  );
}
