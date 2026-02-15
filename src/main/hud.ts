import { BrowserWindow, screen } from "electron";
import { t } from "../shared/i18n";
import type { HudPosition } from "../shared/config";

const HUD_WIDTH = 100;
const HUD_HEIGHT = 116;
const DOCK_MARGIN = 24;
const MIN_SCALE = 0.55;

type HudState = "idle" | "listening" | "processing" | "enhancing" | "error" | "canceled";

function buildHudHtml(): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; user-select: none; -webkit-user-select: none; }
  html, body {
    background: transparent;
    overflow: hidden;
    width: ${HUD_WIDTH}px;
    height: ${HUD_HEIGHT}px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .hud {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: rgba(25, 25, 25, 0.92);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: box-shadow 0.15s ease, background 0.3s ease, border-color 0.3s ease;
    position: relative;
    flex-shrink: 0;
  }
  .hud:hover {
    box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3);
    border-color: rgba(99, 102, 241, 0.4);
  }
  .hud:active {
    transform: scale(0.95);
  }
  .hud.listening {
    background: rgba(255, 68, 68, 0.9);
    border-color: rgba(255, 68, 68, 0.5);
    box-shadow: 0 4px 20px rgba(255, 68, 68, 0.4);
  }
  .hud.listening:hover {
    box-shadow: 0 4px 24px rgba(255, 68, 68, 0.5);
  }
  .hud.processing {
    background: rgba(255, 170, 0, 0.9);
    border-color: rgba(255, 170, 0, 0.5);
    box-shadow: 0 4px 20px rgba(255, 170, 0, 0.3);
    cursor: default;
    pointer-events: none;
  }
  .hud.enhancing {
    background: rgba(68, 170, 255, 0.9);
    border-color: rgba(68, 170, 255, 0.5);
    box-shadow: 0 4px 20px rgba(68, 170, 255, 0.3);
    cursor: default;
    pointer-events: none;
  }
  .hud.error, .hud.canceled {
    background: rgba(251, 191, 36, 0.9);
    border-color: rgba(251, 191, 36, 0.5);
    box-shadow: 0 4px 20px rgba(251, 191, 36, 0.4);
    cursor: pointer;
  }

  .icon { display: flex; align-items: center; justify-content: center; }
  .hidden { display: none !important; }

  .mic-icon svg {
    width: 16px;
    height: 16px;
    transition: filter 0.15s ease;
  }

  .stop-icon {
    width: 12px; height: 12px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.95);
    cursor: pointer;
  }

  .proc-icon {
    width: 16px; height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: rgba(255, 255, 255, 0.9);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .error-icon svg {
    width: 16px; height: 16px;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .cancel-btn {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: rgba(50, 50, 50, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.12);
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s ease, opacity 0.15s ease;
    flex-shrink: 0;
    display: flex;
    opacity: 0;
    pointer-events: none;
  }
  .cancel-btn:hover { background: #ff4444; border-color: rgba(239, 68, 68, 0.5); }
  .cancel-btn svg { width: 10px; height: 10px; }
  .cancel-btn.visible { opacity: 1; pointer-events: auto; }
  .scale-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    transform-origin: center center;
    transition: transform 0.1s ease, opacity 0.1s ease;
  }
</style></head>
<body>
<div class="scale-wrapper" id="scale-wrapper">
<div class="hud" id="hud" role="button" tabindex="0">
  <div class="icon mic-icon" id="mic-icon"><svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg></div>
  <div class="icon hidden" id="stop-icon"><div class="stop-icon"></div></div>
  <div class="icon hidden" id="proc-icon"><div class="proc-icon"></div></div>
  <div class="icon error-icon hidden" id="error-icon"><svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="rgba(255,255,255,0.95)" stroke-width="2" stroke-linecap="round"/></svg></div>
</div>
<div class="cancel-btn" id="cancel-btn" onclick="event.stopPropagation(); window.electronAPI?.cancelRecording()">
  <svg viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 2L2 8M2 2L8 8" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
  </svg>
</div>
</div>
<script>
var state = 'idle';

document.getElementById('hud').addEventListener('click', function() {
  if (state === 'processing' || state === 'enhancing') return;
  if (state === 'error' || state === 'canceled') return;
  if (state === 'idle') {
    window.electronAPI?.hudStartRecording();
  } else if (state === 'listening') {
    window.electronAPI?.hudStopRecording();
  }
});

function setBlur(px) {
  var svg = document.querySelector('#mic-icon svg');
  if (svg) svg.style.filter = px > 0 ? 'blur(' + px + 'px)' : 'none';
}

function setScale(factor) {
  var wrapper = document.getElementById('scale-wrapper');
  wrapper.style.transform = 'scale(' + factor + ')';
  wrapper.style.opacity = factor < 0.7 ? 0.4 + (factor - 0.55) / 0.15 * 0.6 : 1;
  var blurPx = factor >= 0.95 ? 0 : Math.round((1.0 - factor) / (1.0 - 0.55) * 4);
  setBlur(blurPx);
}

function setState(newState, titles) {
  state = newState;
  var hud = document.getElementById('hud');
  hud.className = 'hud' + (newState !== 'idle' ? ' ' + newState : '');

  var isIdle = newState === 'idle';
  var isListening = newState === 'listening';
  var isProc = newState === 'processing' || newState === 'enhancing';
  var isError = newState === 'error' || newState === 'canceled';

  document.getElementById('mic-icon').classList.toggle('hidden', !isIdle);
  document.getElementById('stop-icon').classList.toggle('hidden', !isListening);
  document.getElementById('proc-icon').classList.toggle('hidden', !isProc);
  document.getElementById('error-icon').classList.toggle('hidden', !isError);

  var cancelBtn = document.getElementById('cancel-btn');
  cancelBtn.classList.toggle('visible', isListening);

  if (titles) {
    hud.setAttribute('title', titles.main || '');
    hud.setAttribute('aria-label', titles.main || '');
    if (titles.cancel) cancelBtn.setAttribute('title', titles.cancel);
  }
}

</script>
</body></html>`;
}

export class HudWindow {
  private window: BrowserWindow | null = null;
  private contentReady = false;
  private pendingUpdate: { state: HudState } | null = null;
  private currentState: HudState = "idle";
  private showOnHover = false;
  private position: HudPosition = "center";
  private hoverTimer: ReturnType<typeof setInterval> | null = null;
  private flashTimer: ReturnType<typeof setTimeout> | null = null;

  show(showOnHover: boolean, position: HudPosition = "center"): void {
    this.showOnHover = showOnHover;
    this.position = position;

    if (this.window && !this.window.isDestroyed()) {
      this.positionWindow();
      if (!showOnHover) {
        this.stopHoverTracking();
        this.window.showInactive();
      } else {
        this.startHoverTracking();
      }
      return;
    }

    this.contentReady = false;

    this.window = new BrowserWindow({
      width: HUD_WIDTH,
      height: HUD_HEIGHT,
      frame: false,
      transparent: true,
      hasShadow: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      focusable: false,
      type: "panel",
      acceptFirstMouse: true,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: require.resolve("../preload/index.js"),
      },
    });

    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    this.window.setIgnoreMouseEvents(false);

    this.positionWindow();

    this.window.on("focus", () => {
      if (this.window) this.window.blur();
    });

    this.window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildHudHtml())}`);

    this.window.webContents.on("did-finish-load", () => {
      this.contentReady = true;
      this.sendTitles();
      if (this.pendingUpdate) {
        this.execSetState(this.pendingUpdate.state);
        this.pendingUpdate = null;
      }
    });

    this.window.once("ready-to-show", () => {
      if (!showOnHover) {
        this.window?.showInactive();
      } else {
        this.startHoverTracking();
      }
    });
  }

  hide(): void {
    this.stopHoverTracking();
    this.clearFlashTimer();
    if (this.window && !this.window.isDestroyed()) {
      this.window.destroy();
    }
    this.window = null;
    this.contentReady = false;
    this.pendingUpdate = null;
    this.currentState = "idle";
  }

  setState(state: HudState): void {
    this.clearFlashTimer();
    this.currentState = state;
    if (!this.window || this.window.isDestroyed()) return;

    if (state === "error" || state === "canceled") {
      const ft = setTimeout(() => {
        this.flashTimer = null;
        this.currentState = "idle";
        if (this.contentReady && this.window && !this.window.isDestroyed()) {
          this.execSetState("idle");
        }
      }, 1500);
      ft.unref();
      this.flashTimer = ft;
    }

    if (this.contentReady) {
      this.execSetState(state);
    } else {
      this.pendingUpdate = { state };
    }

    if (this.showOnHover && state !== "idle") {
      this.window.showInactive();
      this.execSetScale(1.0);
    }
  }

  isVisible(): boolean {
    return this.window !== null && !this.window.isDestroyed();
  }

  private positionWindow(): void {
    if (!this.window) return;
    const cursorPoint = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(cursorPoint);
    const workArea = display.workArea;
    let x: number;
    if (this.position === "left") {
      x = workArea.x + DOCK_MARGIN;
    } else if (this.position === "right") {
      x = workArea.x + workArea.width - HUD_WIDTH - DOCK_MARGIN;
    } else {
      x = Math.round(workArea.x + workArea.width / 2 - HUD_WIDTH / 2);
    }
    const y = workArea.y + workArea.height - HUD_HEIGHT - DOCK_MARGIN * 2;
    this.window.setPosition(x, y);
  }

  private sendTitles(): void {
    if (!this.window || this.window.isDestroyed() || !this.contentReady) return;
    const titles = {
      main: t("hud.startRecording"),
      cancel: t("hud.cancelRecording"),
    };
    this.window.webContents.executeJavaScript(
      `setState("${this.currentState}", ${JSON.stringify(titles)})`
    ).catch(() => {});
  }

  private execSetState(state: HudState): void {
    if (!this.window || this.window.isDestroyed()) return;
    const titleKey = state === "idle" ? "hud.startRecording"
      : state === "listening" ? "hud.stopRecording"
      : state === "enhancing" ? "indicator.enhancing"
      : state === "error" ? "indicator.nothingHeard"
      : state === "canceled" ? "indicator.canceled"
      : "indicator.transcribing";
    const titles = {
      main: t(titleKey),
      cancel: t("hud.cancelRecording"),
    };
    this.window.webContents.executeJavaScript(
      `setState("${state}", ${JSON.stringify(titles)})`
    ).catch(() => {});
  }

  private clearFlashTimer(): void {
    if (this.flashTimer) {
      clearTimeout(this.flashTimer);
      this.flashTimer = null;
    }
  }

  private execSetScale(factor: number): void {
    if (!this.window || this.window.isDestroyed() || !this.contentReady) return;
    this.window.webContents.executeJavaScript(
      `setScale(${factor})`
    ).catch(() => {});
  }

  private startHoverTracking(): void {
    this.stopHoverTracking();
    if (!this.window || this.window.isDestroyed()) return;
    this.window.showInactive();
    this.execSetScale(MIN_SCALE);
    const timer = setInterval(() => {
      if (!this.window || this.window.isDestroyed()) return;
      if (this.currentState !== "idle") {
        this.execSetScale(1.0);
        return;
      }
      const cursor = screen.getCursorScreenPoint();
      const [wx, wy] = this.window!.getPosition();
      const hudCenterX = wx + HUD_WIDTH / 2;
      const hudCenterY = wy + HUD_HEIGHT / 2;
      const dist = Math.hypot(cursor.x - hudCenterX, cursor.y - hudCenterY);
      let scale: number;
      if (dist < 40) {
        scale = 1.0;
      } else if (dist > 200) {
        scale = MIN_SCALE;
      } else {
        scale = 1.0 - (dist - 40) / 160 * (1.0 - MIN_SCALE);
      }
      this.execSetScale(scale);
    }, 50);
    timer.unref();
    this.hoverTimer = timer;
  }

  private stopHoverTracking(): void {
    if (this.hoverTimer) {
      clearInterval(this.hoverTimer);
      this.hoverTimer = null;
    }
  }
}
