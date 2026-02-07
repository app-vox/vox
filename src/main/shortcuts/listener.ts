export interface ShortcutCallbacks {
  onStart: () => void;
  onStop: () => void;
}

type RecordingState = "idle" | "hold" | "toggle" | "processing";

// When holding a key on macOS, the OS sends repeated key-down events.
// We detect "key released" by waiting for the repeats to stop.
const HOLD_RELEASE_DELAY_MS = 400;

export class ShortcutStateMachine {
  private state: RecordingState = "idle";
  private holdTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly callbacks: ShortcutCallbacks;

  constructor(callbacks: ShortcutCallbacks) {
    this.callbacks = callbacks;
  }

  handleHoldKeyRepeat(): void {
    if (this.state === "processing") return;

    if (this.state === "idle") {
      this.state = "hold";
      this.callbacks.onStart();
    }

    // Reset the release timer on every key-repeat event
    if (this.state === "hold") {
      this.resetHoldTimer();
    }
  }

  handleTogglePress(): void {
    if (this.state === "processing") return;

    if (this.state === "idle") {
      this.state = "toggle";
      this.callbacks.onStart();
    } else if (this.state === "toggle") {
      this.state = "idle";
      this.callbacks.onStop();
    }
    // If state is "hold" or "processing", ignore toggle press
  }

  /** Enter processing state — ignores all shortcut input until setIdle() is called. */
  setProcessing(): void {
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
    this.state = "processing";
  }

  /** Return to idle after processing completes. */
  setIdle(): void {
    this.state = "idle";
  }

  getState(): RecordingState {
    return this.state;
  }

  private resetHoldTimer(): void {
    if (this.holdTimer) clearTimeout(this.holdTimer);
    this.holdTimer = setTimeout(() => {
      this.holdTimer = null;
      if (this.state === "hold") {
        this.state = "idle";
        this.callbacks.onStop();
      }
    }, HOLD_RELEASE_DELAY_MS);
  }
}
