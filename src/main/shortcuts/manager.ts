import { globalShortcut, ipcMain, Notification } from "electron";
import { uIOhook, UiohookKey } from "uiohook-napi";
import log from "electron-log/main";
import { type ConfigManager } from "../config/manager";
import { pasteText, isAccessibilityGranted } from "../input/paster";
import { type Pipeline, CanceledError, NoModelError } from "../pipeline";
import { ShortcutStateMachine } from "./listener";
import { IndicatorWindow } from "../indicator";
import { HudWindow } from "../hud";
import { setTrayListeningState } from "../tray";
import { t } from "../../shared/i18n";
import { generateCueSamples, isWavCue, getWavFilename, parseWavSamples } from "../../shared/audio-cue";
import type { AudioCueType } from "../../shared/config";
import { readFileSync } from "fs";
import { join } from "path";
import { app } from "electron";

const slog = log.scope("Shortcuts");

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
  analytics?: { track(event: string, properties?: Record<string, unknown>): void };
}

export class ShortcutManager {
  private readonly deps: ShortcutManagerDeps;
  private readonly indicator: IndicatorWindow;
  private readonly hud: HudWindow;
  private stateMachine: ShortcutStateMachine;
  private holdKeyCodes: Set<number> = new Set([UiohookKey.Space]);
  private accessibilityWasGranted = false;
  private watchdogTimer: ReturnType<typeof setInterval> | null = null;
  private isInitializing = true;

  constructor(deps: ShortcutManagerDeps) {
    this.deps = deps;
    this.indicator = new IndicatorWindow();
    this.hud = new HudWindow();

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
          slog.debug("Ignoring shortcut during initialization");
          return;
        }
        this.stateMachine.handleHoldKeyUp();
      }
    });

    uIOhook.on("keydown", (e) => {
      if (e.keycode === UiohookKey.Escape && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const state = this.stateMachine.getState();
        if (state === "hold" || state === "toggle" || state === "processing") {
          slog.info("Escape pressed, canceling operation");
          this.cancelRecording();
        }
      }
    });

    // Check accessibility permission before starting uIOhook
    const hasAccessibility = isAccessibilityGranted();
    if (!hasAccessibility) {
      slog.warn("Accessibility permission not granted — keyboard shortcuts will not work");
      new Notification({
        title: t("notification.accessibilityRequired.title"),
        body: t("notification.accessibilityRequired.body"),
      }).show();

      // Still register global shortcuts (they work without accessibility)
      // but don't start uIOhook to avoid crash
      this.accessibilityWasGranted = false;
      this.startAccessibilityWatchdog();

      setTimeout(() => {
        this.isInitializing = false;
        slog.info("Initialization complete (limited mode — no accessibility)");
      }, 1000);
      this.updateHud();
      return;
    }

    // Wrap uIOhook.start() in try-catch to handle potential crashes gracefully
    try {
      uIOhook.start();
      slog.info("Keyboard hook started successfully");
    } catch (err: unknown) {
      slog.error("Failed to start keyboard hook", err);
      new Notification({
        title: t("notification.hookFailed.title"),
        body: t("notification.hookFailed.body"),
      }).show();

      // Continue with limited functionality
      this.accessibilityWasGranted = false;
      this.startAccessibilityWatchdog();

      setTimeout(() => {
        this.isInitializing = false;
        slog.info("Initialization complete (limited mode — hook failed)");
      }, 1000);
      this.updateHud();
      return;
    }

    this.accessibilityWasGranted = isAccessibilityGranted();
    this.startAccessibilityWatchdog();

    // Allow shortcuts after a brief initialization period
    setTimeout(() => {
      this.isInitializing = false;
      slog.info("Initialization complete, shortcuts enabled");
    }, 1000);
    this.updateHud();
  }

  showIndicator(mode: "initializing" | "listening" | "transcribing" | "enhancing" | "error"): void {
    this.indicator.show(mode);
  }

  sendAudioLevels(levels: number[]): void {
    this.indicator.sendAudioLevels(levels);
  }

  /** Programmatically trigger the toggle shortcut (e.g., from tray menu) */
  triggerToggle(): void {
    if (this.isInitializing) {
      slog.debug("Cannot trigger toggle during initialization");
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
      slog.info("Stop & process requested from tray");
      this.stateMachine.handleTogglePress(); // Toggle off = stop and process
    }
  }

  cancelRecording(): void {
    const state = this.stateMachine.getState();
    if (state === "hold" || state === "toggle" || state === "processing") {
      slog.info("Cancel requested");
      const pipeline = this.deps.getPipeline();
      pipeline.cancel().catch((err) => {
        slog.error("Error during cancel", err);
      });
      this.indicator.showCanceled();
      const config = this.deps.configManager.load();
      const errorCueType = (config.errorAudioCue ?? "error") as AudioCueType;
      this.playCue(errorCueType);
      this.stateMachine.setIdle();
      this.hud.setState("idle");
      this.hud.triggerSparkles("down");
      this.updateTrayState();
    }
  }

  /** Get current recording state (for UI updates) */
  isRecording(): boolean {
    const state = this.stateMachine.getState();
    return state === "hold" || state === "toggle" || state === "processing";
  }

  getIndicator(): IndicatorWindow {
    return this.indicator;
  }

  updateHud(): void {
    const config = this.deps.configManager.load();
    if (config.showHud) {
      this.hud.show(config.hudShowOnHover);
    } else {
      this.hud.hide();
    }
  }

  getHud(): HudWindow {
    return this.hud;
  }

  getStateMachineState(): string {
    return this.stateMachine.getState();
  }

  stop(): void {
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    this.hud.hide();
    globalShortcut.unregisterAll();
    uIOhook.stop();
  }

  private updateTrayState(): void {
    setTrayListeningState(this.isRecording());
  }

  private playCue(cueType: AudioCueType): void {
    if (cueType === "none") return;
    const pipeline = this.deps.getPipeline();

    if (isWavCue(cueType)) {
      const filename = getWavFilename(cueType);
      if (!filename) return;
      try {
        const audioDir = app.isPackaged
          ? join(process.resourcesPath, "resources", "audio")
          : join(app.getAppPath(), "resources", "audio");
        const wavData = readFileSync(join(audioDir, filename));
        const { samples, sampleRate } = parseWavSamples(wavData);
        if (samples.length > 0) {
          pipeline.playAudioCue(samples, sampleRate).catch((err: Error) => {
            slog.error("WAV audio cue failed", err);
          });
        }
      } catch (err: unknown) {
        slog.error("Failed to load WAV cue", err);
      }
    } else {
      const samples = generateCueSamples(cueType, 44100);
      if (samples.length > 0) {
        pipeline.playAudioCue(samples).catch((err: Error) => {
          slog.error("Audio cue failed", err);
        });
      }
    }
  }

  registerShortcutKeys(): void {
    const config = this.deps.configManager.load();

    // When re-registering shortcuts (e.g., after config change or hot reload),
    // briefly disable shortcuts to prevent spurious activations
    this.isInitializing = true;

    // Cancel any ongoing recording to prevent spurious paste events during hot-reload
    const pipeline = this.deps.getPipeline();
    pipeline.cancel();
    this.stateMachine.setIdle();

    globalShortcut.unregisterAll();

    const holdOk = globalShortcut.register(config.shortcuts.hold, () => {
      if (this.isInitializing) {
        slog.debug("Ignoring hold shortcut during initialization");
        return;
      }
      this.stateMachine.handleHoldKeyDown();
    });

    const toggleOk = globalShortcut.register(config.shortcuts.toggle, () => {
      if (this.isInitializing) {
        slog.debug("Ignoring toggle shortcut during initialization");
        return;
      }
      this.stateMachine.handleTogglePress();
    });

    if (!holdOk) slog.warn("Failed to register hold shortcut:", config.shortcuts.hold);
    if (!toggleOk) slog.warn("Failed to register toggle shortcut:", config.shortcuts.toggle);

    this.holdKeyCodes = getHoldKeyCodes(config.shortcuts.hold);

    slog.info("Shortcuts registered: hold=%s, toggle=%s", config.shortcuts.hold, config.shortcuts.toggle);

    // Re-enable shortcuts after a longer delay to prevent spurious activations
    setTimeout(() => {
      this.isInitializing = false;
      slog.info("Shortcuts re-enabled after registration");
    }, 1500);
  }

  private registerIpcHandlers(): void {
    ipcMain.handle("shortcuts:disable", () => {
      globalShortcut.unregisterAll();
    });

    ipcMain.handle("shortcuts:enable", () => {
      this.registerShortcutKeys();
    });

    ipcMain.handle("indicator:cancel-recording", () => {
      this.cancelRecording();
    });

    ipcMain.handle("hud:start-recording", () => {
      if (!this.isRecording()) {
        this.triggerToggle();
      }
    });

    ipcMain.handle("hud:stop-recording", () => {
      this.stopAndProcess();
    });
  }

  private startAccessibilityWatchdog(): void {
    this.watchdogTimer = setInterval(() => {
      const granted = isAccessibilityGranted();

      if (this.accessibilityWasGranted && !granted) {
        slog.warn("Accessibility permission revoked — stopping keyboard hook");
        try {
          uIOhook.stop();
        } catch (err: unknown) {
          slog.error("Error stopping keyboard hook", err);
        }
        globalShortcut.unregisterAll();
        new Notification({
          title: t("notification.accessibilityRevoked.title"),
          body: t("notification.accessibilityRevoked.body"),
        }).show();
      } else if (!this.accessibilityWasGranted && granted) {
        slog.info("Accessibility permission restored — restarting keyboard hook");
        try {
          uIOhook.start();
          this.registerShortcutKeys();
          new Notification({
            title: t("notification.shortcutsEnabled.title"),
            body: t("notification.shortcutsEnabled.body"),
          }).show();
        } catch (err: unknown) {
          slog.error("Failed to restart keyboard hook", err);
          new Notification({
            title: t("notification.restartRequired.title"),
            body: t("notification.restartRequired.body"),
          }).show();
        }
      }

      this.accessibilityWasGranted = granted;
    }, 3000);
  }

  private onRecordingStart(): void {
    const pipeline = this.deps.getPipeline();
    slog.info("Recording requested — showing initializing indicator");
    this.indicator.show("initializing");
    this.hud.setState("listening");
    this.hud.triggerSparkles("up");
    this.updateTrayState();

    pipeline.startRecording().then(() => {
      slog.info("Recording started — mic active");
      this.indicator.show("listening");

      const config = this.deps.configManager.load();
      const cueType = (config.recordingAudioCue ?? "tap") as AudioCueType;
      this.playCue(cueType);
    }).catch((err: Error) => {
      slog.error("Recording failed", err);
      this.indicator.hide();
      this.updateTrayState();

      if (err instanceof NoModelError) {
        this.indicator.showError(3000, t("notification.setupRequired.indicator"));
        this.stateMachine.setIdle();
        this.updateTrayState();
        new Notification({
          title: t("notification.setupRequired.title"),
          body: t("notification.setupRequired.body"),
        }).show();
      } else {
        new Notification({ title: "Vox", body: t("notification.recordingFailed", { error: err.message }) }).show();
      }
    });
  }

  private async onRecordingStop(): Promise<void> {
    const pipeline = this.deps.getPipeline();
    this.stateMachine.setProcessing();
    this.updateTrayState();
    slog.info("Recording stopped, processing pipeline");
    this.indicator.show("transcribing");
    this.hud.setState("processing");

    const config = this.deps.configManager.load();
    const stopCueType = (config.recordingStopAudioCue ?? "pop") as AudioCueType;
    this.playCue(stopCueType);

    try {
      const text = await pipeline.stopAndProcess();
      slog.info("Pipeline complete, text: %s", text.slice(0, 80));
      const trimmedText = text.trim();

      if (!trimmedText || trimmedText.length === 0) {
        slog.info("No valid text to paste, showing error indicator");
        this.indicator.showError();
        const errorCueType = (config.errorAudioCue ?? "error") as AudioCueType;
        this.playCue(errorCueType);
      } else {
        slog.info("Valid text received, proceeding with paste");
        await new Promise((r) => setTimeout(r, 200));
        pasteText(trimmedText);
        this.deps.analytics?.track("paste_completed", { method: "auto-paste" });
        this.indicator.hide();
      }
    } catch (err: unknown) {
      if (err instanceof CanceledError) {
        slog.info("Operation canceled by user");
        this.indicator.showCanceled();
        const errorCueType = (config.errorAudioCue ?? "error") as AudioCueType;
        this.playCue(errorCueType);
      } else {
        slog.error("Pipeline failed", err);
        this.deps.analytics?.track("paste_failed", {
          error_type: err instanceof Error ? err.name : "unknown",
        });
        this.indicator.showError();
        const errorCueType = (config.errorAudioCue ?? "error") as AudioCueType;
        this.playCue(errorCueType);
      }
    } finally {
      this.stateMachine.setIdle();
      this.hud.setState("idle");
      this.hud.triggerSparkles("down");
      this.updateTrayState();
      slog.info("Ready for next recording");
    }
  }
}
