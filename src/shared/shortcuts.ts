export const DOUBLE_TAP_PREFIX = "DoubleTap:";
export const DOUBLE_TAP_THRESHOLD_MS = 400;

export function isDoubleTap(shortcut: string): boolean {
  return shortcut.startsWith(DOUBLE_TAP_PREFIX);
}

export function getDoubleTapModifier(shortcut: string): string | null {
  if (!isDoubleTap(shortcut)) return null;
  return shortcut.slice(DOUBLE_TAP_PREFIX.length);
}
