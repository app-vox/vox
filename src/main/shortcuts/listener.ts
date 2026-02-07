export interface ShortcutCallbacks {
  onStart: () => void;
  onStop: () => void;
}

type RecordingState = "idle" | "hold" | "toggle" | "processing";

export class ShortcutStateMachine {
  private state: RecordingState = "idle";
  private readonly callbacks: ShortcutCallbacks;

  constructor(callbacks: ShortcutCallbacks) {
    this.callbacks = callbacks;
  }

  /** Called when the hold shortcut key is pressed down. */
  handleHoldKeyDown(): void {
    if (this.state === "processing") return;

    if (this.state === "idle") {
      this.state = "hold";
      this.callbacks.onStart();
    }
  }

  /** Called when the hold shortcut key is released. */
  handleHoldKeyUp(): void {
    if (this.state === "hold") {
      this.state = "idle";
      this.callbacks.onStop();
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
    } else if (this.state === "hold") {
      // On macOS packaged apps, Alt+Shift+Space can also trigger Alt+Space,
      // entering hold mode before toggle fires. Promote to toggle mode so
      // the recording continues until the user explicitly stops it.
      this.state = "toggle";
    }
  }

  /** Enter processing state — ignores all shortcut input until setIdle() is called. */
  setProcessing(): void {
    this.state = "processing";
  }

  /** Return to idle after processing completes. */
  setIdle(): void {
    this.state = "idle";
  }

  getState(): RecordingState {
    return this.state;
  }
}
