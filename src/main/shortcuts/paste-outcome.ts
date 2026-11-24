/** How a transcript's paste ended, which decides what the HUD shows after it. */
export type PasteOutcome = "pasted" | "incomplete" | "insert-failed";

export function pasteOutcome(inserted: boolean, incomplete: boolean): PasteOutcome {
  if (!inserted) return "insert-failed";
  return incomplete ? "incomplete" : "pasted";
}
