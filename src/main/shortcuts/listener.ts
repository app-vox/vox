export interface ShortcutCallbacks {
  onStart: () => void;
  onStop: () => void;
}

export enum RecordingState {
  Idle = "idle",
  Hold = "hold",
  Toggle = "toggle",
  Processing = "processing",
  Canceling = "canceling",
}

export class ShortcutStateMachine {
  private state = RecordingState.Idle;
  private readonly callbacks: ShortcutCallbacks;

  constructor(callbacks: ShortcutCallbacks) {
    this.callbacks = callbacks;
  }

  /** Called when the hold shortcut key is pressed down. */
  handleHoldKeyDown(): void {
    if (this.state === RecordingState.Processing || this.state === RecordingState.Canceling) return;

    if (this.state === RecordingState.Idle) {
      this.state = RecordingState.Hold;
      this.callbacks.onStart();
    }
  }

  /** Called when the hold shortcut key is released. */
  handleHoldKeyUp(): void {
    if (this.state === RecordingState.Canceling) return;
    if (this.state === RecordingState.Hold) {
      this.state = RecordingState.Idle;
      this.callbacks.onStop();
    }
  }

  handleTogglePress(): void {
    if (this.state === RecordingState.Processing || this.state === RecordingState.Canceling) return;

    if (this.state === RecordingState.Idle) {
      this.state = RecordingState.Toggle;
      this.callbacks.onStart();
    } else if (this.state === RecordingState.Toggle) {
      this.state = RecordingState.Idle;
      this.callbacks.onStop();
    } else if (this.state === RecordingState.Hold) {
      this.state = RecordingState.Toggle;
    }
  }

  /** Enter processing state — ignores all shortcut input until setIdle() is called. */
  setProcessing(): void {
    this.state = RecordingState.Processing;
  }

  /** Enter canceling state — ignores all shortcut input until setIdle() or undone. */
  setCanceling(): void {
    this.state = RecordingState.Canceling;
  }

  /** Return to idle after processing completes. */
  setIdle(): void {
    this.state = RecordingState.Idle;
  }

  getState(): RecordingState {
    return this.state;
  }
}
