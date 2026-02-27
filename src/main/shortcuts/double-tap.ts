import { DOUBLE_TAP_THRESHOLD_MS } from "../../shared/shortcuts";

export class DoubleTapDetector {
  private lastKeyUpTime = 0;
  private nonModifierPressed = false;
  private consumed = false;
  private readonly onDoubleTap: () => void;

  constructor(onDoubleTap: () => void) {
    this.onDoubleTap = onDoubleTap;
  }

  handleKeyUp(timestamp: number): void {
    if (this.consumed) {
      // Ignore the keyup that follows a successful double-tap trigger.
      // This prevents the release of the second tap from immediately
      // starting a new sequence.
      this.consumed = false;
      return;
    }
    this.lastKeyUpTime = timestamp;
    this.nonModifierPressed = false;
  }

  handleKeyDown(timestamp: number): boolean {
    if (
      this.lastKeyUpTime > 0 &&
      !this.nonModifierPressed &&
      timestamp - this.lastKeyUpTime <= DOUBLE_TAP_THRESHOLD_MS
    ) {
      this.onDoubleTap();
      this.lastKeyUpTime = 0; // consume the sequence
      this.consumed = true;
      return true;
    }
    // Not a double-tap — this keydown doesn't update lastKeyUpTime
    // (only keyup starts a new potential sequence)
    return false;
  }

  handleNonModifierKey(): void {
    this.nonModifierPressed = true;
  }

  reset(): void {
    this.lastKeyUpTime = 0;
    this.nonModifierPressed = false;
    this.consumed = false;
  }
}
