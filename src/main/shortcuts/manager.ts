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
        this.stateMachine.handleHoldKeyUp();
      }
    });
    uIOhook.start();

    this.accessibilityWasGranted = isAccessibilityGranted();
    this.startAccessibilityWatchdog();
  }

  showIndicator(mode: "listening" | "transcribing" | "correcting" | "error"): void {
    this.indicator.show(mode);
  }

  stop(): void {
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    globalShortcut.unregisterAll();
    uIOhook.stop();
  }

  registerShortcutKeys(): void {
    const config = this.deps.configManager.load();

    globalShortcut.unregisterAll();

    const holdOk = globalShortcut.register(config.shortcuts.hold, () => {
      this.stateMachine.handleHoldKeyDown();
    });

    const toggleOk = globalShortcut.register(config.shortcuts.toggle, () => {
      this.stateMachine.handleTogglePress();
    });

    if (!holdOk) console.warn(`[Vox] Failed to register hold shortcut: ${config.shortcuts.hold}`);
    if (!toggleOk) console.warn(`[Vox] Failed to register toggle shortcut: ${config.shortcuts.toggle}`);

    this.holdKeyCodes = getHoldKeyCodes(config.shortcuts.hold);

    console.log(`[Vox] Shortcuts registered: hold=${config.shortcuts.hold}, toggle=${config.shortcuts.toggle}`);
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
    pipeline.startRecording().catch((err: Error) => {
      console.error("[Vox] Recording failed:", err.message);
      this.indicator.hide();
      new Notification({ title: "Vox", body: `Recording failed: ${err.message}` }).show();
    });
  }

  private async onRecordingStop(): Promise<void> {
    const pipeline = this.deps.getPipeline();
    this.stateMachine.setProcessing();
    console.log("[Vox] Recording stopped, processing pipeline");
    this.indicator.show("transcribing");
    try {
      const text = await pipeline.stopAndProcess();
      console.log("[Vox] Pipeline complete, text:", text.slice(0, 80));
      if (!text.trim()) {
        this.indicator.showError();
      } else {
        this.indicator.hide();
        await new Promise((r) => setTimeout(r, 200));
        pasteText(text);
        new Notification({ title: "Vox", body: text }).show();
      }
    } catch (err: any) {
      console.error("[Vox] Pipeline failed:", err.message);
      this.indicator.showError();
    } finally {
      this.stateMachine.setIdle();
      console.log("[Vox] Ready for next recording");
    }
  }
}
