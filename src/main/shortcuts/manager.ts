import { globalShortcut, ipcMain, Notification } from "electron";
import { uIOhook, UiohookKey } from "uiohook-napi";
import { type ConfigManager } from "../config/manager";
import { pasteText, isAccessibilityGranted } from "../input/paster";
import { type Pipeline } from "../pipeline";
import { ShortcutStateMachine } from "./listener";
import { IndicatorWindow } from "../indicator";

/** Map Electron accelerator key names to UiohookKey keycodes. */
const KEY_TO_UIOHOOK: Record<string, number> = {
  Command: UiohookKey.Meta, Cmd: UiohookKey.Meta, Meta: UiohookKey.Meta,
  Ctrl: UiohookKey.Ctrl, Control: UiohookKey.Ctrl,
  Alt: UiohookKey.Alt, Option: UiohookKey.Alt,
  Shift: UiohookKey.Shift,
  Fn: 63, // Fn key (may not be detectable via uiohook on all systems)
  Space: UiohookKey.Space,
  Enter: UiohookKey.Enter,
  Backspace: UiohookKey.Backspace,
  Tab: UiohookKey.Tab,
  Delete: UiohookKey.Delete,
  Home: UiohookKey.Home,
  End: UiohookKey.End,
  PageUp: UiohookKey.PageUp,
  PageDown: UiohookKey.PageDown,
  Up: UiohookKey.ArrowUp,
  Down: UiohookKey.ArrowDown,
  Left: UiohookKey.ArrowLeft,
  Right: UiohookKey.ArrowRight,
  F1: UiohookKey.F1, F2: UiohookKey.F2, F3: UiohookKey.F3, F4: UiohookKey.F4,
  F5: UiohookKey.F5, F6: UiohookKey.F6, F7: UiohookKey.F7, F8: UiohookKey.F8,
  F9: UiohookKey.F9, F10: UiohookKey.F10, F11: UiohookKey.F11, F12: UiohookKey.F12,
  F13: UiohookKey.F13, F14: UiohookKey.F14, F15: UiohookKey.F15, F16: UiohookKey.F16,
  F17: UiohookKey.F17, F18: UiohookKey.F18, F19: UiohookKey.F19, F20: UiohookKey.F20,
  F21: UiohookKey.F21, F22: UiohookKey.F22, F23: UiohookKey.F23, F24: UiohookKey.F24,
  A: UiohookKey.A, B: UiohookKey.B, C: UiohookKey.C, D: UiohookKey.D,
  E: UiohookKey.E, F: UiohookKey.F, G: UiohookKey.G, H: UiohookKey.H,
  I: UiohookKey.I, J: UiohookKey.J, K: UiohookKey.K, L: UiohookKey.L,
  M: UiohookKey.M, N: UiohookKey.N, O: UiohookKey.O, P: UiohookKey.P,
  Q: UiohookKey.Q, R: UiohookKey.R, S: UiohookKey.S, T: UiohookKey.T,
  U: UiohookKey.U, V: UiohookKey.V, W: UiohookKey.W, X: UiohookKey.X,
  Y: UiohookKey.Y, Z: UiohookKey.Z,
  "0": UiohookKey[0], "1": UiohookKey[1], "2": UiohookKey[2],
  "3": UiohookKey[3], "4": UiohookKey[4], "5": UiohookKey[5],
  "6": UiohookKey[6], "7": UiohookKey[7], "8": UiohookKey[8],
  "9": UiohookKey[9],
  "-": UiohookKey.Minus, "=": UiohookKey.Equal,
  "[": UiohookKey.BracketLeft, "]": UiohookKey.BracketRight,
  "\\": UiohookKey.Backslash, ";": UiohookKey.Semicolon,
  "'": UiohookKey.Quote, ",": UiohookKey.Comma,
  ".": UiohookKey.Period, "/": UiohookKey.Slash,
  "`": UiohookKey.Backquote,
  // Media and special keys (might not work with uiohook, but support in Electron)
  BrightnessDown: 0, BrightnessUp: 0,
  AudioVolumeDown: 0, AudioVolumeUp: 0, AudioVolumeMute: 0,
  MediaPlayPause: 0, MediaStop: 0,
  MediaTrackPrevious: 0, MediaTrackNext: 0,
  LaunchApp1: 0, LaunchApp2: 0,
};

function getHoldKeyCodes(accelerator: string): Set<number> {
  const codes = new Set<number>();
  for (const part of accelerator.split("+")) {
    const code = KEY_TO_UIOHOOK[part];
    if (code !== undefined) codes.add(code);
  }
  return codes;
}

export interface ShortcutManagerDeps {
  configManager: ConfigManager;
  getPipeline: () => Pipeline;
}

export class ShortcutManager {
  private readonly deps: ShortcutManagerDeps;
  private readonly indicator: IndicatorWindow;
  private stateMachine: ShortcutStateMachine;
  private holdKeyCodes: Set<number> = new Set([UiohookKey.Space]);
  private accessibilityWasGranted = false;
  private watchdogTimer: ReturnType<typeof setInterval> | null = null;
  private isInitializing = true;

  constructor(deps: ShortcutManagerDeps) {
    this.deps = deps;
    this.indicator = new IndicatorWindow();

    this.stateMachine = new ShortcutStateMachine({
      onStart: () => this.onRecordingStart(),
      onStop: () => this.onRecordingStop(),
    });
  }

  start(): void {
    this.registerShortcutKeys();
    this.registerIpcHandlers();

    uIOhook.on("keyup", (e) => {
      if (this.holdKeyCodes.has(e.keycode)) {
        // Ignore events during initialization to prevent spurious shortcuts
        if (this.isInitializing) {
          console.log("[Vox] Ignoring shortcut during initialization");
          return;
        }
        this.stateMachine.handleHoldKeyUp();
      }
    });
    uIOhook.start();

    this.accessibilityWasGranted = isAccessibilityGranted();
    this.startAccessibilityWatchdog();

    // Allow shortcuts after a brief initialization period
    setTimeout(() => {
      this.isInitializing = false;
      console.log("[Vox] Initialization complete, shortcuts enabled");
    }, 1000);
  }

  showIndicator(mode: "listening" | "transcribing" | "correcting" | "error"): void {
    this.indicator.show(mode);
  }

  /** Programmatically trigger the toggle shortcut (e.g., from tray menu) */
  triggerToggle(): void {
    if (this.isInitializing) {
      console.log("[Vox] Cannot trigger toggle during initialization");
      return;
    }
    this.stateMachine.handleTogglePress();
    // Update tray immediately after toggle (before async recording starts)
    setTimeout(() => this.updateTrayState(), 100);
  }

  /** Stop recording and process (complete listening) */
  stopAndProcess(): void {
    const state = this.stateMachine.getState();
    if (state === "hold" || state === "toggle") {
      console.log("[Vox] Stop & process requested from tray");
      this.stateMachine.handleTogglePress(); // Toggle off = stop and process
    }
  }

  /** Cancel recording without processing */
  cancelRecording(): void {
    const state = this.stateMachine.getState();
    if (state === "hold" || state === "toggle" || state === "processing") {
      console.log("[Vox] Cancel requested from tray");
      const pipeline = this.deps.getPipeline();
      pipeline.cancel();
      this.indicator.showError(); // Using showError temporarily until showCanceled is added
      this.stateMachine.setIdle();
      this.updateTrayState();
    }
  }

  /** Get current recording state (for UI updates) */
  isRecording(): boolean {
    const state = this.stateMachine.getState();
    return state === "hold" || state === "toggle" || state === "processing";
  }

  stop(): void {
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    globalShortcut.unregisterAll();
    uIOhook.stop();
  }

  private updateTrayState(): void {
    const { setTrayListeningState } = require("../tray");
    setTrayListeningState(this.isRecording());
  }

  registerShortcutKeys(): void {
    const config = this.deps.configManager.load();

    // When re-registering shortcuts (e.g., after config change or hot reload),
    // briefly disable shortcuts to prevent spurious activations
    this.isInitializing = true;

    // Cancel any ongoing recording to prevent spurious paste events
    this.stateMachine.setIdle();

    globalShortcut.unregisterAll();

    const holdOk = globalShortcut.register(config.shortcuts.hold, () => {
      if (this.isInitializing) {
        console.log("[Vox] Ignoring hold shortcut during initialization");
        return;
      }
      this.stateMachine.handleHoldKeyDown();
    });

    const toggleOk = globalShortcut.register(config.shortcuts.toggle, () => {
      if (this.isInitializing) {
        console.log("[Vox] Ignoring toggle shortcut during initialization");
        return;
      }
      this.stateMachine.handleTogglePress();
    });

    if (!holdOk) console.warn(`[Vox] Failed to register hold shortcut: ${config.shortcuts.hold}`);
    if (!toggleOk) console.warn(`[Vox] Failed to register toggle shortcut: ${config.shortcuts.toggle}`);

    this.holdKeyCodes = getHoldKeyCodes(config.shortcuts.hold);

    console.log(`[Vox] Shortcuts registered: hold=${config.shortcuts.hold}, toggle=${config.shortcuts.toggle}`);

    // Re-enable shortcuts after a longer delay to prevent spurious activations
    setTimeout(() => {
      this.isInitializing = false;
      console.log("[Vox] Shortcuts re-enabled after registration");
    }, 1500);
  }

  private registerIpcHandlers(): void {
    ipcMain.handle("shortcuts:disable", () => {
      globalShortcut.unregisterAll();
    });

    ipcMain.handle("shortcuts:enable", () => {
      this.registerShortcutKeys();
    });
  }

  private startAccessibilityWatchdog(): void {
    this.watchdogTimer = setInterval(() => {
      const granted = isAccessibilityGranted();

      if (this.accessibilityWasGranted && !granted) {
        console.warn("[Vox] Accessibility permission revoked — stopping keyboard hook");
        uIOhook.stop();
        globalShortcut.unregisterAll();
      } else if (!this.accessibilityWasGranted && granted) {
        console.log("[Vox] Accessibility permission restored — restarting keyboard hook");
        uIOhook.start();
        this.registerShortcutKeys();
      }

      this.accessibilityWasGranted = granted;
    }, 3000);
  }

  private onRecordingStart(): void {
    const pipeline = this.deps.getPipeline();
    console.log("[Vox] Recording started");
    this.indicator.show("listening");
    this.updateTrayState();
    pipeline.startRecording().catch((err: Error) => {
      console.error("[Vox] Recording failed:", err.message);
      this.indicator.hide();
      this.updateTrayState();
      new Notification({ title: "Vox", body: `Recording failed: ${err.message}` }).show();
    });
  }

  private async onRecordingStop(): Promise<void> {
    const pipeline = this.deps.getPipeline();
    this.stateMachine.setProcessing();
    this.updateTrayState();
    console.log("[Vox] Recording stopped, processing pipeline");
    this.indicator.show("transcribing");
    try {
      const text = await pipeline.stopAndProcess();
      console.log("[Vox] Pipeline complete, text:", text.slice(0, 80));
      const trimmedText = text.trim();

      // Only paste if we have valid, non-empty text from the transcript
      if (!trimmedText || trimmedText.length === 0) {
        console.log("[Vox] No valid text to paste, showing error");
        this.indicator.showError();
      } else {
        console.log("[Vox] Valid text received, proceeding with paste");
        this.indicator.hide();
        await new Promise((r) => setTimeout(r, 200));
        pasteText(trimmedText);
        new Notification({ title: "Vox", body: trimmedText }).show();
      }
    } catch (err: unknown) {
      console.error("[Vox] Pipeline failed:", err instanceof Error ? err.message : err);
      this.indicator.showError();
    } finally {
      this.stateMachine.setIdle();
      this.updateTrayState();
      console.log("[Vox] Ready for next recording");
    }
  }
}
