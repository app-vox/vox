import { BrowserWindow, clipboard, globalShortcut, ipcMain, Notification, screen } from "electron";
import { uIOhook, UiohookKey } from "uiohook-napi";
import log from "electron-log/main";
import { type ConfigManager } from "../config/manager";
import { pasteText, isAccessibilityGranted } from "../input/paster";
import { type Pipeline, CanceledError, NoModelError } from "../pipeline";
import { ShortcutStateMachine, RecordingState } from "./listener";
import { HudWindow } from "../hud";
import { setTrayListeningState, updateTrayConfig } from "../tray";
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
  openSettings?: (tab?: string) => void;
  hasModel: () => boolean;
}

export class ShortcutManager {
  private readonly deps: ShortcutManagerDeps;
  private readonly hud: HudWindow;
  private stateMachine: ShortcutStateMachine;
  private holdKeyCodes: Set<number> = new Set([UiohookKey.Space]);
  private accessibilityWasGranted = false;
  private watchdogTimer: ReturnType<typeof setInterval> | null = null;
  private displayDebounce: ReturnType<typeof setTimeout> | null = null;
  private displayChangeHandler: (() => void) | null = null;
  private isInitializing = true;
  private recordingGeneration = 0;
  private micActiveAt = 0;
  private cancelTimer: ReturnType<typeof setTimeout> | null = null;
  private canceledAtStage: string | null = null;
  private devModelOverride: boolean | null = null;
  private lastUnpastedText: string | null = null;
  private static readonly MIN_RECORDING_MS = 400;

  constructor(deps: ShortcutManagerDeps) {
    this.deps = deps;
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
        if (state === RecordingState.Canceling) {
          slog.info("Second ESC pressed during grace period — immediate cancel");
          this.confirmCancel();
        } else if (state === RecordingState.Hold || state === RecordingState.Toggle || state === RecordingState.Processing) {
          slog.info("Escape pressed, starting graceful cancel");
          this.cancelRecording();
        } else {
          this.dismissHud();
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
      this.startDisplayChangeListener();
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
      this.startDisplayChangeListener();
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
    this.startDisplayChangeListener();
    this.updateHud();
  }

  sendAudioLevels(levels: number[]): void {
    this.hud.sendAudioLevels(levels);
  }

  /** Programmatically trigger the toggle shortcut (e.g., from tray menu) */
  triggerToggle(): void {
    if (this.isInitializing) {
      slog.debug("Cannot trigger toggle during initialization");
      return;
    }
    if (this.stateMachine.getState() === RecordingState.Canceling) {
      this.silentAbortCancel();
      this.stateMachine.handleTogglePress();
      setTimeout(() => this.updateTrayState(), 100);
      return;
    }
    if (this.stateMachine.getState() === RecordingState.Processing) {
      this.restartRecording();
      return;
    }
    this.stateMachine.handleTogglePress();
    // Update tray immediately after toggle (before async recording starts)
    setTimeout(() => this.updateTrayState(), 100);
  }

  /** Stop recording and process (complete listening) */
  stopAndProcess(): void {
    const state = this.stateMachine.getState();
    if (state === RecordingState.Hold || state === RecordingState.Toggle) {
      slog.info("Stop & process requested from tray");
      this.stateMachine.handleTogglePress(); // Toggle off = stop and process
    }
  }

  cancelRecording(): void {
    const state = this.stateMachine.getState();
    if (state === RecordingState.Canceling) {
      this.confirmCancel();
      return;
    }
    if (state === RecordingState.Hold || state === RecordingState.Toggle || state === RecordingState.Processing) {
      slog.info("Graceful cancel requested");
      this.micActiveAt = 0;
      this.recordingGeneration++;
      const pipeline = this.deps.getPipeline();
      const { stage } = pipeline.gracefulCancel();
      slog.info("Pipeline paused at stage: %s", stage);
      this.canceledAtStage = stage;
      this.deps.analytics?.track("graceful_cancel_started", { stage });

      const config = this.deps.configManager.load();
      const errorCueType = (config.errorAudioCue ?? "error") as AudioCueType;
      this.playCue(errorCueType);

      this.stateMachine.setCanceling();
      this.hud.setState("canceled", undefined, true);
      this.hud.showUndoBar(3000);

      this.cancelTimer = setTimeout(() => {
        this.confirmCancel();
      }, 3000);

      this.updateTrayState();
    }
  }

  undoCancel(): void {
    if (this.stateMachine.getState() !== RecordingState.Canceling) return;

    slog.info("Undo cancel requested — resuming pipeline");
    this.deps.analytics?.track("graceful_cancel_undone", { stage: this.canceledAtStage });
    this.canceledAtStage = null;
    if (this.cancelTimer) {
      clearTimeout(this.cancelTimer);
      this.cancelTimer = null;
    }

    const pipeline = this.deps.getPipeline();
    this.stateMachine.setProcessing();
    this.recordingGeneration++;
    const gen = this.recordingGeneration;

    this.hud.hideUndoBar();
    this.hud.setState("transcribing");
    this.updateTrayState();

    pipeline.undoCancel().then((text) => {
      if (gen !== this.recordingGeneration) {
        slog.info("Stale undo result — discarding");
        return;
      }

      const trimmedText = text.trim();
      if (!trimmedText) {
        slog.info("No valid text after undo, showing error");
        const config = this.deps.configManager.load();
        const errorCueType = (config.errorAudioCue ?? "error") as AudioCueType;
        this.playCue(errorCueType);
        this.stateMachine.setIdle();
        this.hud.setState("error");
      } else {
        slog.info("Undo succeeded, pasting text");
        const config = this.deps.configManager.load();
        const pasted = pasteText(trimmedText, config.copyToClipboard);

        if (!pasted) {
          slog.info("Text not inserted — showing HUD warning");
          const errorCueType = (config.errorAudioCue ?? "error") as AudioCueType;
          this.playCue(errorCueType);
          this.lastUnpastedText = trimmedText;
          this.stateMachine.setIdle();
          this.hud.showWarning();
        } else {
          this.lastUnpastedText = null;
          this.deps.analytics?.track("paste_completed", { method: "undo-cancel" });
          this.stateMachine.setIdle();
          this.hud.setState("idle");
        }
      }
      this.updateTrayState();
    }).catch((err: unknown) => {
      if (gen !== this.recordingGeneration) return;
      slog.error("Undo pipeline failed", err);
      const config = this.deps.configManager.load();
      const errorCueType = (config.errorAudioCue ?? "error") as AudioCueType;
      this.playCue(errorCueType);
      this.stateMachine.setIdle();
      this.hud.setState("error");
      this.updateTrayState();
    });
  }

  private silentAbortCancel(): void {
    if (this.cancelTimer) {
      clearTimeout(this.cancelTimer);
      this.cancelTimer = null;
    }
    this.micActiveAt = 0;
    this.recordingGeneration++;
    const pipeline = this.deps.getPipeline();
    pipeline.confirmCancel();
    this.hud.hideUndoBar();
    this.canceledAtStage = null;
    this.stateMachine.setIdle();
    slog.info("Silent abort cancel — starting new recording");
  }

  private confirmCancel(): void {
    if (this.stateMachine.getState() !== RecordingState.Canceling) return;

    slog.info("Cancel confirmed — discarding");
    this.deps.analytics?.track("graceful_cancel_confirmed", { stage: this.canceledAtStage });
    this.cancelTimer = null;
    this.canceledAtStage = null;
    this.micActiveAt = 0;
    this.recordingGeneration++;
    const pipeline = this.deps.getPipeline();
    pipeline.confirmCancel();

    const config = this.deps.configManager.load();
    const errorCueType = (config.errorAudioCue ?? "error") as AudioCueType;
    this.playCue(errorCueType);

    this.hud.hideUndoBar();
    this.stateMachine.setIdle();
    this.hud.setState("idle");
    this.updateTrayState();
  }

  private pauseCancelTimer(): void {
    if (this.cancelTimer) {
      clearTimeout(this.cancelTimer);
      this.cancelTimer = null;
    }
  }

  private resumeCancelTimer(remainMs: number): void {
    if (this.stateMachine.getState() !== RecordingState.Canceling) return;
    this.cancelTimer = setTimeout(() => {
      this.confirmCancel();
    }, remainMs);
  }

  /** Cancel current operation silently and immediately start a new recording. */
  private restartRecording(mode: "hold" | "toggle" = "toggle"): void {
    slog.info("Restart requested (mode=%s) — aborting current pipeline and starting new recording", mode);
    this.deps.analytics?.track("recording_restarted", {
      previous_state: this.stateMachine.getState(),
      mode,
    });
    this.recordingGeneration++;
    this.micActiveAt = 0;
    const pipeline = this.deps.getPipeline();
    pipeline.cancel().catch((err) => {
      slog.error("Error during restart cancel", err);
    });
    this.stateMachine.setIdle();
    if (mode === RecordingState.Hold) {
      this.stateMachine.handleHoldKeyDown();
    } else {
      this.stateMachine.handleTogglePress();
    }
    this.updateTrayState();
  }

  dismissHud(): void {
    const hudState = this.hud.getState();
    if (hudState === "error" || hudState === "canceled" || hudState === "warning") {
      slog.info("Dismissing HUD state: %s", hudState);
      this.hud.setState("idle");
    }
  }

  /** Get current recording state (for UI updates) */
  isRecording(): boolean {
    const state = this.stateMachine.getState();
    return state === RecordingState.Hold || state === RecordingState.Toggle || state === RecordingState.Processing || state === RecordingState.Canceling;
  }

  private hasModel(): boolean {
    if (this.devModelOverride !== null) return this.devModelOverride;
    return this.deps.hasModel();
  }

  setDevModelOverride(hasModel: boolean | null): void {
    this.devModelOverride = hasModel;
    this.updateHud();
  }

  updateHud(): void {
    const config = this.deps.configManager.load();
    this.hud.setTargetDisplay(config.targetDisplayId);
    if (config.hudPosition === "custom") {
      this.hud.setCustomPosition(config.hudCustomX, config.hudCustomY);
    }
    this.hud.show(config.showHud, config.hudShowOnHover, config.hudPosition);
    this.hud.setShowActions(config.showHudActions);
    this.hud.setPerformanceFlags(config.reduceAnimations, config.reduceVisualEffects);
  }

  getHud(): HudWindow {
    return this.hud;
  }

  getStateMachineState(): string {
    return this.stateMachine.getState();
  }

  stop(): void {
    if (this.cancelTimer) {
      clearTimeout(this.cancelTimer);
      this.cancelTimer = null;
    }
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    this.stopDisplayChangeListener();
    this.hud.hide();
    globalShortcut.unregisterAll();
    uIOhook.stop();
  }

  private updateTrayState(): void {
    setTrayListeningState(this.isRecording());
  }

  private playCue(cueType: AudioCueType): Promise<void> {
    if (cueType === "none") return Promise.resolve();
    const pipeline = this.deps.getPipeline();

    if (isWavCue(cueType)) {
      const filename = getWavFilename(cueType);
      if (!filename) return Promise.resolve();
      try {
        const audioDir = app.isPackaged
          ? join(process.resourcesPath, "resources", "audio")
          : join(app.getAppPath(), "resources", "audio");
        const wavData = readFileSync(join(audioDir, filename));
        const { samples, sampleRate } = parseWavSamples(wavData);
        if (samples.length > 0) {
          return pipeline.playAudioCue(samples, sampleRate).catch((err: Error) => {
            slog.error("WAV audio cue failed", err);
          });
        }
      } catch (err: unknown) {
        slog.error("Failed to load WAV cue", err);
      }
    } else {
      const samples = generateCueSamples(cueType, 44100);
      if (samples.length > 0) {
        return pipeline.playAudioCue(samples).catch((err: Error) => {
          slog.error("Audio cue failed", err);
        });
      }
    }
    return Promise.resolve();
  }

  registerShortcutKeys(): void {
    const config = this.deps.configManager.load();
    const busy = this.isRecording();

    if (busy) {
      // A recording/processing/canceling session is active.
      // Re-register global shortcuts without disrupting the pipeline or state machine.
      slog.info("Re-registering shortcuts while busy (state=%s) — keeping pipeline alive", this.stateMachine.getState());
    } else {
      // When re-registering shortcuts (e.g., after config change or hot reload),
      // briefly disable shortcuts to prevent spurious activations
      this.isInitializing = true;

      // Cancel any ongoing recording to prevent spurious paste events during hot-reload
      const pipeline = this.deps.getPipeline();
      pipeline.cancel();
      this.stateMachine.setIdle();
    }

    globalShortcut.unregisterAll();

    const holdOk = globalShortcut.register(config.shortcuts.hold, () => {
      if (this.isInitializing) {
        slog.debug("Ignoring hold shortcut during initialization");
        return;
      }
      if (!this.hasModel()) {
        this.hud.showError(3000, t("notification.setupRequired.indicator"));
        return;
      }
      if (this.stateMachine.getState() === RecordingState.Canceling) {
        this.silentAbortCancel();
        this.stateMachine.handleHoldKeyDown();
        return;
      }
      if (this.stateMachine.getState() === RecordingState.Processing) {
        this.restartRecording("hold");
        return;
      }
      this.stateMachine.handleHoldKeyDown();
    });

    const toggleOk = globalShortcut.register(config.shortcuts.toggle, () => {
      if (this.isInitializing) {
        slog.debug("Ignoring toggle shortcut during initialization");
        return;
      }
      if (!this.hasModel()) {
        this.hud.showError(3000, t("notification.setupRequired.indicator"));
        return;
      }
      if (this.stateMachine.getState() === RecordingState.Canceling) {
        this.silentAbortCancel();
        this.stateMachine.handleTogglePress();
        return;
      }
      if (this.stateMachine.getState() === RecordingState.Processing) {
        this.restartRecording();
        return;
      }
      this.stateMachine.handleTogglePress();
    });

    if (!holdOk) slog.warn("Failed to register hold shortcut:", config.shortcuts.hold);
    if (!toggleOk) slog.warn("Failed to register toggle shortcut:", config.shortcuts.toggle);

    this.holdKeyCodes = getHoldKeyCodes(config.shortcuts.hold);

    slog.info("Shortcuts registered: hold=%s, toggle=%s", config.shortcuts.hold, config.shortcuts.toggle);

    if (!busy) {
      // Re-enable shortcuts after a longer delay to prevent spurious activations
      setTimeout(() => {
        this.isInitializing = false;
        slog.info("Shortcuts re-enabled after registration");
      }, 1500);
    }
  }

  private registerIpcHandlers(): void {
    ipcMain.handle("shortcuts:disable", () => {
      globalShortcut.unregisterAll();
    });

    ipcMain.handle("shortcuts:enable", (_event, immediate?: boolean) => {
      this.registerShortcutKeys();
      if (immediate) {
        this.isInitializing = false;
      }
    });

    ipcMain.handle("indicator:cancel-recording", () => {
      this.cancelRecording();
    });

    ipcMain.handle("indicator:undo-cancel", () => {
      this.undoCancel();
    });

    ipcMain.handle("indicator:pause-cancel", () => {
      this.pauseCancelTimer();
    });

    ipcMain.handle("indicator:resume-cancel", (_event, remainMs: number) => {
      this.resumeCancelTimer(remainMs);
    });

    ipcMain.handle("hud:start-recording", () => {
      if (!this.hasModel()) {
        this.hud.showError(3000, t("notification.setupRequired.indicator"));
        return;
      }
      if (this.stateMachine.getState() === RecordingState.Canceling) {
        this.silentAbortCancel();
        this.stateMachine.handleTogglePress();
      } else if (this.stateMachine.getState() === RecordingState.Processing) {
        this.restartRecording();
      } else if (!this.isRecording()) {
        this.triggerToggle();
      }
    });

    ipcMain.handle("hud:stop-recording", () => {
      this.stopAndProcess();
    });

    ipcMain.handle("hud:open-settings", () => {
      this.deps.openSettings?.("general");
    });

    ipcMain.handle("hud:open-transcriptions", () => {
      this.deps.openSettings?.("transcriptions");
    });

    ipcMain.handle("hud:copy-latest", () => {
      if (!this.lastUnpastedText) return false;
      clipboard.writeText(this.lastUnpastedText);
      this.deps.analytics?.track("paste_completed", { method: "copy-latest" });
      this.lastUnpastedText = null;
      this.hud.setState("idle");
      return true;
    });

    ipcMain.handle("hud:disable", () => {
      const config = this.deps.configManager.load();
      config.showHud = false;
      this.deps.configManager.save(config);
      this.hud.hide();
      updateTrayConfig(config);
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send("config:changed");
      }
    });

    ipcMain.handle("hud:drag", (_event, dx: number, dy: number) => {
      this.hud.drag(dx, dy);
    });

    ipcMain.handle("hud:drag-end", () => {
      const result = this.hud.dragEnd();
      if (result) {
        const config = this.deps.configManager.load();
        config.hudPosition = "custom";
        config.hudCustomX = result.nx;
        config.hudCustomY = result.ny;
        config.targetDisplayId = result.displayId;
        this.deps.configManager.save(config);
        for (const win of BrowserWindow.getAllWindows()) {
          win.webContents.send("config:changed");
        }
      }
    });

    ipcMain.handle("hud:set-position", (_event, nx: number, ny: number) => {
      this.hud.setPosition(nx, ny);
    });

    ipcMain.handle("hud:show-highlight", () => {
      this.hud.showHighlight();
    });

    ipcMain.handle("hud:hide-highlight", () => {
      this.hud.hideHighlight();
    });

    ipcMain.handle("hud:set-ignore-mouse", (_event, ignore: boolean) => {
      this.hud.setIgnoreMouseEvents(ignore);
    });

    ipcMain.handle("hud:dismiss", () => {
      this.dismissHud();
    });

    ipcMain.handle("hud:pause-flash", () => {
      this.hud.pauseFlashTimer();
    });

    ipcMain.handle("hud:resume-flash", () => {
      this.hud.resumeFlashTimer();
    });

  }

  private startAccessibilityWatchdog(): void {
    const timer = setInterval(() => {
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
    timer.unref();
    this.watchdogTimer = timer;
  }

  private startDisplayChangeListener(): void {
    this.displayChangeHandler = () => {
      if (this.displayDebounce) clearTimeout(this.displayDebounce);
      this.displayDebounce = setTimeout(() => {
        this.displayDebounce = null;
        slog.info("Display configuration changed — repositioning HUD");
        this.hud.reposition();
      }, 500);
    };
    screen.on("display-added", this.displayChangeHandler);
    screen.on("display-removed", this.displayChangeHandler);
  }

  private stopDisplayChangeListener(): void {
    if (this.displayChangeHandler) {
      screen.removeListener("display-added", this.displayChangeHandler);
      screen.removeListener("display-removed", this.displayChangeHandler);
      this.displayChangeHandler = null;
    }
    if (this.displayDebounce) {
      clearTimeout(this.displayDebounce);
      this.displayDebounce = null;
    }
  }

  private onRecordingStart(): void {
    const pipeline = this.deps.getPipeline();
    this.recordingGeneration++;
    this.lastUnpastedText = null;
    const gen = this.recordingGeneration;
    slog.info("Recording requested (gen=%d) — showing initializing HUD", gen);
    this.hud.setState("initializing");
    this.updateTrayState();

    this.micActiveAt = 0;
    pipeline.startRecording().then(async () => {
      if (gen !== this.recordingGeneration) {
        slog.info("Stale recording start (gen=%d, current=%d) — stopping mic", gen, this.recordingGeneration);
        pipeline.cancel().catch((e) => slog.error("Error stopping stale recording", e));
        return;
      }
      this.micActiveAt = Date.now();
      slog.info("Recording started — mic active");

      const config = this.deps.configManager.load();
      const cueType = (config.recordingAudioCue ?? "tap") as AudioCueType;

      await Promise.race([
        this.playCue(cueType),
        new Promise<void>((resolve) => setTimeout(resolve, 1500)),
      ]);

      if (gen !== this.recordingGeneration) {
        slog.info("Stale recording after cue (gen=%d, current=%d) — stopping mic", gen, this.recordingGeneration);
        pipeline.cancel().catch((e: Error) => slog.error("Error stopping stale recording", e));
        return;
      }

      this.hud.setState("listening");
    }).catch((err: Error) => {
      if (gen !== this.recordingGeneration) {
        slog.info("Stale recording error (gen=%d, current=%d) — discarding", gen, this.recordingGeneration);
        pipeline.cancel().catch(() => {});
        return;
      }
      slog.error("Recording failed", err);
      pipeline.cancel().catch(() => {});
      this.updateTrayState();

      if (err instanceof NoModelError) {
        this.hud.showError(3000, t("notification.setupRequired.indicator"));
        this.stateMachine.setIdle();
        this.updateTrayState();
        new Notification({
          title: t("notification.setupRequired.title"),
          body: t("notification.setupRequired.body"),
        }).show();
      } else {
        this.hud.setState("idle");
        new Notification({ title: "Vox", body: t("notification.recordingFailed", { error: err.message }) }).show();
      }
    });
  }

  private async onRecordingStop(): Promise<void> {
    const elapsed = this.micActiveAt > 0 ? Date.now() - this.micActiveAt : 0;
    if (this.micActiveAt === 0 || elapsed < ShortcutManager.MIN_RECORDING_MS) {
      slog.info("Recording too short (%dms) or mic not ready — canceling", elapsed);
      this.micActiveAt = 0;
      this.recordingGeneration++;
      const pipeline = this.deps.getPipeline();
      pipeline.cancel().catch((err) => {
        slog.error("Error during short-recording cancel", err);
      });
      const config = this.deps.configManager.load();
      const errorCueType = (config.errorAudioCue ?? "error") as AudioCueType;
      this.playCue(errorCueType);
      this.stateMachine.setIdle();
      this.hud.setState("canceled");
      this.updateTrayState();
      return;
    }

    const pipeline = this.deps.getPipeline();
    const gen = this.recordingGeneration;
    this.stateMachine.setProcessing();
    this.updateTrayState();
    slog.info("Recording stopped, processing pipeline (gen=%d)", gen);
    this.hud.setState("transcribing");

    const config = this.deps.configManager.load();
    const stopCueType = (config.recordingStopAudioCue ?? "pop") as AudioCueType;
    this.playCue(stopCueType);

    let hudEndState: "idle" | "error" | "canceled" | "warning" = "idle";
    try {
      const text = await pipeline.stopAndProcess();

      // If generation changed, a restart/cancel happened — abandon this result
      if (gen !== this.recordingGeneration) {
        slog.info("Stale pipeline result (gen=%d, current=%d) — discarding", gen, this.recordingGeneration);
        return;
      }

      slog.info("Pipeline complete, text: %s", text.slice(0, 80));
      const trimmedText = text.trim();

      if (!trimmedText || trimmedText.length === 0) {
        slog.info("No valid text to paste, showing error");
        const errorCueType = (config.errorAudioCue ?? "error") as AudioCueType;
        this.playCue(errorCueType);
        hudEndState = "error";
      } else {
        slog.info("Valid text received, proceeding with paste");
        await new Promise((r) => setTimeout(r, 200));
        const pasteConfig = this.deps.configManager.load();
        const pasted = pasteText(trimmedText, pasteConfig.copyToClipboard, { lowercaseStart: pasteConfig.lowercaseStart });

        if (!pasted && config.onboardingCompleted) {
          slog.info("Text not inserted — showing HUD warning");
          const errorCueType = (config.errorAudioCue ?? "error") as AudioCueType;
          this.playCue(errorCueType);
          this.lastUnpastedText = trimmedText;
          hudEndState = "warning";
        } else {
          this.lastUnpastedText = null;
          this.deps.analytics?.track("paste_completed", { method: !pasted ? "onboarding" : "auto-paste" });
        }
      }
    } catch (err: unknown) {
      // If generation changed, a restart/cancel already handled state — bail out
      if (gen !== this.recordingGeneration) {
        slog.info("Stale pipeline error (gen=%d, current=%d) — discarding", gen, this.recordingGeneration);
        return;
      }
      if (err instanceof CanceledError) {
        slog.info("Operation canceled by user");
        const errorCueType = (config.errorAudioCue ?? "error") as AudioCueType;
        this.playCue(errorCueType);
        hudEndState = "canceled";
      } else {
        slog.error("Pipeline failed", err);
        this.deps.analytics?.track("paste_failed", {
          error_type: err instanceof Error ? err.name : "unknown",
        });
        const errorCueType = (config.errorAudioCue ?? "error") as AudioCueType;
        this.playCue(errorCueType);
        hudEndState = "error";
      }
    } finally {
      // Only update state if this is still the current generation
      if (gen === this.recordingGeneration) {
        this.stateMachine.setIdle();
        this.hud.setState(hudEndState);
        this.updateTrayState();
        slog.info("Ready for next recording");
      }
    }
  }
}
