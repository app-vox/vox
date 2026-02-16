import { readFileSync } from "fs";
import { getResourcePath } from "./resources";
import { BrowserWindow, screen } from "electron";
import { t } from "../shared/i18n";
import type { WidgetPosition } from "../shared/config";

const HUD_WIDTH = 72;
const HUD_HEIGHT = 72;
const DOCK_MARGIN = 24;
const MIN_SCALE = 0.55;

type HudState = "idle" | "listening" | "processing" | "enhancing" | "error" | "canceled";

function getLogoDataUrl(): string {
  try {
    const logoPath = getResourcePath("logo.png");
    const buf = readFileSync(logoPath);
    return "data:image/png;base64," + buf.toString("base64");
  } catch {
    return "";
  }
}

function buildHudHtml(): string {
  const logoDataUrl = getLogoDataUrl();
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; user-select: none; -webkit-user-select: none; }
  html, body {
    background: transparent;
    overflow: hidden;
    width: ${HUD_WIDTH}px;
    height: ${HUD_HEIGHT}px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .scale-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    transform-origin: center center;
    transition: transform 0.15s ease, opacity 0.15s ease;
    position: relative;
  }

  .hud {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: rgba(25, 25, 25, 0.92);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.2), 0 8px 24px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: box-shadow 0.15s ease, background 0.3s ease, border-color 0.3s ease;
    position: relative;
    flex-shrink: 0;
  }
  .hud:hover {
    box-shadow: 0 2px 6px rgba(99, 102, 241, 0.15), 0 4px 16px rgba(99, 102, 241, 0.2);
    border-color: rgba(99, 102, 241, 0.4);
  }
  .hud:active:not(.dragging) { transform: scale(0.95); }
  .hud.listening {
    background: rgba(255, 68, 68, 0.9);
    border-color: rgba(255, 68, 68, 0.5);
    box-shadow: 0 2px 6px rgba(255, 68, 68, 0.2), 0 4px 16px rgba(255, 68, 68, 0.25);
  }
  .hud.listening:hover {
    box-shadow: 0 2px 8px rgba(255, 68, 68, 0.25), 0 6px 20px rgba(255, 68, 68, 0.3);
  }
  .hud.processing {
    background: rgba(255, 170, 0, 0.9);
    border-color: rgba(255, 170, 0, 0.5);
    box-shadow: 0 2px 6px rgba(255, 170, 0, 0.15), 0 4px 16px rgba(255, 170, 0, 0.2);
    cursor: default; pointer-events: none;
  }
  .hud.enhancing {
    background: rgba(68, 170, 255, 0.9);
    border-color: rgba(68, 170, 255, 0.5);
    box-shadow: 0 2px 6px rgba(68, 170, 255, 0.15), 0 4px 16px rgba(68, 170, 255, 0.2);
    cursor: default; pointer-events: none;
  }
  .hud.error, .hud.canceled {
    background: rgba(251, 191, 36, 0.9);
    border-color: rgba(251, 191, 36, 0.5);
    box-shadow: 0 2px 6px rgba(251, 191, 36, 0.2), 0 4px 16px rgba(251, 191, 36, 0.25);
    cursor: pointer;
  }
  .hud.highlight {
    border-color: rgba(99, 102, 241, 0.6);
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3), 0 4px 16px rgba(0, 0, 0, 0.3);
  }

  .icon {
    display: flex; align-items: center; justify-content: center;
    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    transition: opacity 0.35s ease;
  }
  .icon.off { opacity: 0; pointer-events: none; }

  .v-logo img { width: 18px; height: 18px; object-fit: contain; }
  .mic-icon svg { width: 16px; height: 16px; }
  .stop-icon { width: 12px; height: 12px; border-radius: 2px; background: rgba(255, 255, 255, 0.95); cursor: pointer; }
  .proc-icon { width: 16px; height: 16px; border: 2px solid rgba(255, 255, 255, 0.3); border-top-color: rgba(255, 255, 255, 0.9); border-radius: 50%; animation: spin 0.8s linear infinite; }
  .error-icon svg { width: 16px; height: 16px; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .hover-btn {
    position: absolute;
    width: 18px; height: 18px; border-radius: 50%;
    background: rgba(50, 50, 50, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.12);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; opacity: 0; pointer-events: none;
    transition: opacity 0.2s ease, background 0.15s ease;
  }
  .hover-btn.visible { opacity: 1; pointer-events: auto; }
  .hover-btn svg { width: 10px; height: 10px; }

  /* Trash: top-right */
  .close-btn { top: -10px; right: -10px; }
  .close-btn:hover { background: rgba(239, 68, 68, 0.8); }

  /* Transcriptions: bottom-left */
  .transcriptions-btn { bottom: -8px; left: -8px; }
  .transcriptions-btn:hover { background: rgba(99, 102, 241, 0.8); }

  /* Settings: bottom-right */
  .settings-btn { bottom: -8px; right: -8px; }
  .settings-btn:hover { background: rgba(99, 102, 241, 0.8); }

  /* Cancel button (below circle during recording) */
  .cancel-btn {
    width: 22px; height: 22px; border-radius: 50%;
    background: rgba(50, 50, 50, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.12);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; flex-shrink: 0;
    transition: background 0.15s ease, opacity 0.15s ease;
    opacity: 0; pointer-events: none;
    margin-top: 6px;
  }
  .cancel-btn:hover { background: #ff4444; border-color: rgba(239, 68, 68, 0.5); }
  .cancel-btn svg { width: 10px; height: 10px; }
  .cancel-btn.visible { opacity: 1; pointer-events: auto; }
</style></head>
<body>
<div class="scale-wrapper" id="scale-wrapper">
  <div class="hud" id="hud" role="button" tabindex="0">
    <div class="icon v-logo" id="v-logo"><img src="${logoDataUrl}" alt="Vox" draggable="false" /></div>
    <div class="icon mic-icon off" id="mic-icon"><svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg></div>
    <div class="icon off" id="stop-icon"><div class="stop-icon"></div></div>
    <div class="icon off" id="proc-icon"><div class="proc-icon"></div></div>
    <div class="icon error-icon off" id="error-icon"><svg viewBox="0 0 14 14" fill="none"><path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="rgba(255,255,255,0.95)" stroke-width="2" stroke-linecap="round"/></svg></div>
    <div class="hover-btn close-btn" id="close-btn" onclick="event.stopPropagation(); window.electronAPI?.hudDisable()">
      <svg viewBox="0 0 10 10" fill="none"><path d="M2 3h6M3.5 3V2.2a.5.5 0 01.5-.5h2a.5.5 0 01.5.5V3" stroke="white" stroke-width="1.2" stroke-linecap="round"/><path d="M7.5 3.5l-.3 4.3a.8.8 0 01-.8.7h-2.8a.8.8 0 01-.8-.7L2.5 3.5" stroke="white" stroke-width="1.2" stroke-linecap="round"/></svg>
    </div>
    <div class="hover-btn transcriptions-btn" id="transcriptions-btn" onclick="event.stopPropagation(); window.electronAPI?.hudOpenTranscriptions()">
      <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    </div>
    <div class="hover-btn settings-btn" id="settings-btn" onclick="event.stopPropagation(); window.electronAPI?.hudOpenSettings()">
      <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    </div>
  </div>
  <div class="cancel-btn" id="cancel-btn" onclick="event.stopPropagation(); window.electronAPI?.cancelRecording()">
    <svg viewBox="0 0 10 10" fill="none">
      <path d="M8 2L2 8M2 2L8 8" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  </div>
</div>
<script>
var state = 'idle';
var hoverActionsTimer = null;
var isMouseOver = false;
var isDragging = false;
var wasDragged = false;
var dragStartX = 0;
var dragStartY = 0;

document.getElementById('hud').addEventListener('mousedown', function(e) {
  if (e.target.closest('.close-btn')) return;
  isDragging = false;
  wasDragged = false;
  dragStartX = e.screenX;
  dragStartY = e.screenY;

  var onMove = function(ev) {
    var dx = ev.screenX - dragStartX;
    var dy = ev.screenY - dragStartY;
    if (!isDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      isDragging = true;
      wasDragged = true;
      document.getElementById('hud').classList.add('dragging');
      clearHoverActions();
    }
    if (isDragging) {
      dragStartX = ev.screenX;
      dragStartY = ev.screenY;
      window.electronAPI?.hudDrag(dx, dy);
    }
  };

  var onUp = function() {
    if (isDragging) {
      isDragging = false;
      document.getElementById('hud').classList.remove('dragging');
      window.electronAPI?.hudDragEnd();
    }
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
});

document.getElementById('hud').addEventListener('click', function(e) {
  if (e.target.closest('.hover-btn')) return;
  if (wasDragged) { wasDragged = false; return; }
  if (state === 'processing' || state === 'enhancing') return;
  if (state === 'error' || state === 'canceled') return;
  clearHoverActions();
  if (state === 'idle') {
    window.electronAPI?.hudStartRecording();
  } else if (state === 'listening') {
    window.electronAPI?.hudStopRecording();
  }
});

/* Logo <-> mic crossfade on hover (idle only) */
document.getElementById('hud').addEventListener('mouseenter', function() {
  if (state === 'idle') {
    document.getElementById('v-logo').classList.add('off');
    document.getElementById('mic-icon').classList.remove('off');
  }
});
document.getElementById('hud').addEventListener('mouseleave', function() {
  if (state === 'idle') {
    document.getElementById('v-logo').classList.remove('off');
    document.getElementById('mic-icon').classList.add('off');
  }
});

document.body.addEventListener('mouseenter', function() {
  isMouseOver = true;
  if (state === 'idle') startHoverActionsTimer();
});

document.body.addEventListener('mouseleave', function() {
  isMouseOver = false;
  clearHoverActions();
  if (state === 'idle') {
    document.getElementById('v-logo').classList.remove('off');
    document.getElementById('mic-icon').classList.add('off');
  }
});

function showSideButtons() {
  document.getElementById('transcriptions-btn').classList.add('visible');
  document.getElementById('settings-btn').classList.add('visible');
  document.getElementById('close-btn').classList.add('visible');
}

function hideSideButtons() {
  document.getElementById('transcriptions-btn').classList.remove('visible');
  document.getElementById('settings-btn').classList.remove('visible');
  document.getElementById('close-btn').classList.remove('visible');
}

function startHoverActionsTimer() {
  clearHoverActions();
  hoverActionsTimer = setTimeout(function() {
    if (state === 'idle' && isMouseOver && !isDragging) {
      showSideButtons();
    }
  }, 1500);
}

function clearHoverActions() {
  if (hoverActionsTimer) { clearTimeout(hoverActionsTimer); hoverActionsTimer = null; }
  hideSideButtons();
}

function setBlur(px) {
  var img = document.querySelector('#v-logo img');
  if (img) img.style.filter = px > 0 ? 'blur(' + px + 'px)' : 'none';
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
  clearHoverActions();
  var hud = document.getElementById('hud');
  hud.className = 'hud' + (newState !== 'idle' ? ' ' + newState : '');

  var isIdle = newState === 'idle';
  var isListening = newState === 'listening';
  var isProc = newState === 'processing' || newState === 'enhancing';
  var isError = newState === 'error' || newState === 'canceled';

  if (isIdle && isMouseOver) {
    document.getElementById('v-logo').classList.add('off');
    document.getElementById('mic-icon').classList.remove('off');
    startHoverActionsTimer();
  } else {
    document.getElementById('v-logo').classList.toggle('off', !isIdle);
    document.getElementById('mic-icon').classList.toggle('off', true);
  }
  document.getElementById('stop-icon').classList.toggle('off', !isListening);
  document.getElementById('proc-icon').classList.toggle('off', !isProc);
  document.getElementById('error-icon').classList.toggle('off', !isError);

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
  private position: WidgetPosition = "bottom-center";
  private customX = 0.5;
  private customY = 0.9;
  private targetDisplayId: number | null = null;
  private hoverTimer: ReturnType<typeof setInterval> | null = null;
  private flashTimer: ReturnType<typeof setTimeout> | null = null;

  show(showOnHover: boolean, position: WidgetPosition = "bottom-center"): void {
    const positionChanged = this.position !== position;
    this.showOnHover = showOnHover;
    this.position = position;

    if (this.window && !this.window.isDestroyed()) {
      if (positionChanged) this.positionWindow();
      if (!showOnHover) {
        this.stopHoverTracking();
        this.execSetScale(1.0);
        this.resetIconCrossfade();
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
    const display = this.targetDisplayId !== null
      ? screen.getAllDisplays().find(d => d.id === this.targetDisplayId) ?? screen.getPrimaryDisplay()
      : screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    const workArea = display.workArea;

    if (this.position === "custom") {
      const x = Math.round(display.bounds.x + display.bounds.width * this.customX - HUD_WIDTH / 2);
      const y = Math.round(display.bounds.y + display.bounds.height * this.customY - HUD_HEIGHT / 2);
      this.window.setPosition(x, y);
      return;
    }

    const parts = this.position.split("-");
    const vPos = parts[0] || "bottom";
    const hPos = parts[1] || "center";

    let x: number;
    if (hPos === "left") {
      x = workArea.x + DOCK_MARGIN;
    } else if (hPos === "right") {
      x = workArea.x + workArea.width - HUD_WIDTH - DOCK_MARGIN;
    } else {
      x = Math.round(workArea.x + workArea.width / 2 - HUD_WIDTH / 2);
    }
    const y = vPos === "top"
      ? workArea.y + DOCK_MARGIN * 2
      : vPos === "center"
      ? Math.round(workArea.y + workArea.height / 2 - HUD_HEIGHT / 2)
      : workArea.y + workArea.height - HUD_HEIGHT - DOCK_MARGIN * 2;
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

  private resetIconCrossfade(): void {
    if (!this.window || this.window.isDestroyed() || !this.contentReady) return;
    this.window.webContents.executeJavaScript(
      `document.getElementById('v-logo').classList.remove('off');` +
      `document.getElementById('mic-icon').classList.add('off');` +
      `setBlur(0)`
    ).catch(() => {});
  }

  setCustomPosition(x: number, y: number): void {
    this.customX = x;
    this.customY = y;
    this.position = "custom";
    this.positionWindow();
  }

  setTargetDisplay(id: number | null): void {
    this.targetDisplayId = id;
  }

  getTargetDisplay(): number | null {
    return this.targetDisplayId;
  }

  setPosition(nx: number, ny: number): void {
    this.customX = nx;
    this.customY = ny;
    this.position = "custom";
    this.positionWindow();
  }

  drag(dx: number, dy: number): void {
    if (!this.window || this.window.isDestroyed()) return;
    const [x, y] = this.window.getPosition();
    this.window.setPosition(x + dx, y + dy);
  }

  dragEnd(): { nx: number; ny: number } | null {
    if (!this.window || this.window.isDestroyed()) return null;
    const display = this.targetDisplayId !== null
      ? screen.getAllDisplays().find(d => d.id === this.targetDisplayId) ?? screen.getPrimaryDisplay()
      : screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    const [x, y] = this.window.getPosition();
    const nx = (x + HUD_WIDTH / 2 - display.bounds.x) / display.bounds.width;
    const ny = (y + HUD_HEIGHT / 2 - display.bounds.y) / display.bounds.height;
    this.customX = nx;
    this.customY = ny;
    this.position = "custom";
    return { nx, ny };
  }

  showHighlight(): void {
    if (!this.window || this.window.isDestroyed() || !this.contentReady) return;
    this.window.webContents.executeJavaScript(
      `document.getElementById('hud').classList.add('highlight')`
    ).catch(() => {});
  }

  hideHighlight(): void {
    if (!this.window || this.window.isDestroyed() || !this.contentReady) return;
    this.window.webContents.executeJavaScript(
      `document.getElementById('hud').classList.remove('highlight')`
    ).catch(() => {});
  }
}
