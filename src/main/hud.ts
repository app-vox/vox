import { BrowserWindow, screen } from "electron";
import { t } from "../shared/i18n";

const HUD_WIDTH = 48;
const HUD_HEIGHT = 48;
const DOCK_MARGIN = 10;

type HudState = "idle" | "listening" | "processing";

function buildHudHtml(): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; user-select: none; -webkit-user-select: none; }
  html, body {
    background: transparent;
    overflow: hidden;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .hud {
    width: 36px;
    height: 36px;
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
    transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
    position: relative;
  }
  .hud:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3);
    border-color: rgba(99, 102, 241, 0.4);
  }
  .hud:active {
    transform: scale(0.95);
  }
  .hud.recording {
    background: rgba(255, 68, 68, 0.9);
    border-color: rgba(255, 68, 68, 0.5);
    box-shadow: 0 4px 20px rgba(255, 68, 68, 0.4);
  }
  .hud.recording:hover {
    box-shadow: 0 4px 24px rgba(255, 68, 68, 0.5);
  }
  .hud.processing {
    background: rgba(255, 170, 0, 0.9);
    border-color: rgba(255, 170, 0, 0.5);
    box-shadow: 0 4px 20px rgba(255, 170, 0, 0.3);
    cursor: default;
    pointer-events: none;
  }

  .icon { display: flex; align-items: center; justify-content: center; }
  .hidden { display: none !important; }

  .play-icon {
    width: 0; height: 0;
    border-style: solid;
    border-width: 6px 0 6px 11px;
    border-color: transparent transparent transparent rgba(255, 255, 255, 0.9);
    margin-left: 2px;
  }

  .stop-icon {
    width: 10px; height: 10px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.95);
  }

  .proc-icon {
    width: 14px; height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: rgba(255, 255, 255, 0.9);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .cancel-btn {
    position: absolute;
    top: -6px;
    right: -6px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: rgba(75, 75, 75, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.15);
    display: none;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s ease;
  }
  .cancel-btn:hover { background: #ef4444; }
  .cancel-btn svg { width: 8px; height: 8px; }
  .hud.recording:hover .cancel-btn { display: flex; }

  .sparkle-container {
    position: fixed;
    left: 0; top: 0; right: 0; bottom: 0;
    pointer-events: none;
    overflow: visible;
    z-index: 999;
  }
  .sparkle {
    position: absolute;
    pointer-events: none;
    opacity: 0;
  }
  @keyframes sparkle-rise {
    0%   { opacity: 0; transform: translateY(0) scale(0.3) rotate(0deg); }
    15%  { opacity: 1; transform: translateY(-40px) scale(1) rotate(45deg); }
    80%  { opacity: 0.8; transform: translateY(-280px) scale(0.7) rotate(135deg); }
    100% { opacity: 0; transform: translateY(-350px) scale(0.2) rotate(180deg); }
  }
  @keyframes sparkle-fall {
    0%   { opacity: 0; transform: translateY(-350px) scale(0.2) rotate(180deg); }
    15%  { opacity: 1; transform: translateY(-280px) scale(0.7) rotate(135deg); }
    80%  { opacity: 0.8; transform: translateY(-40px) scale(1) rotate(45deg); }
    100% { opacity: 0; transform: translateY(0) scale(0.3) rotate(0deg); }
  }
</style></head>
<body>
<div class="sparkle-container" id="sparkles"></div>
<div class="hud" id="hud" role="button" tabindex="0">
  <div class="icon" id="play-icon"><div class="play-icon"></div></div>
  <div class="icon hidden" id="stop-icon"><div class="stop-icon"></div></div>
  <div class="icon hidden" id="proc-icon"><div class="proc-icon"></div></div>
  <div class="cancel-btn" id="cancel-btn" onclick="event.stopPropagation(); window.electronAPI?.cancelRecording()">
    <svg viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 2L2 8M2 2L8 8" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  </div>
</div>
<script>
var state = 'idle';

document.getElementById('hud').addEventListener('click', function() {
  if (state === 'processing') return;
  if (state === 'idle') {
    window.electronAPI?.hudStartRecording();
  } else if (state === 'listening') {
    window.electronAPI?.hudStopRecording();
  }
});

function setState(newState, titles) {
  state = newState;
  var hud = document.getElementById('hud');
  hud.className = 'hud' + (newState !== 'idle' ? ' ' + newState : '');

  document.getElementById('play-icon').classList.toggle('hidden', newState !== 'idle');
  document.getElementById('stop-icon').classList.toggle('hidden', newState !== 'listening');
  document.getElementById('proc-icon').classList.toggle('hidden', newState !== 'processing');

  if (titles) {
    hud.setAttribute('title', titles.main || '');
    hud.setAttribute('aria-label', titles.main || '');
    var cb = document.getElementById('cancel-btn');
    if (titles.cancel) cb.setAttribute('title', titles.cancel);
  }
}

function spawnSparkles(direction) {
  var container = document.getElementById('sparkles');
  var count = 5;
  var animName = direction === 'up' ? 'sparkle-rise' : 'sparkle-fall';
  for (var i = 0; i < count; i++) {
    var el = document.createElement('div');
    el.className = 'sparkle';
    var xOffset = (Math.random() - 0.5) * 30;
    var delay = i * 80 + Math.random() * 60;
    var hue = 240 + Math.random() * 60;
    el.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 0L7.4 4.6L12 6L7.4 7.4L6 12L4.6 7.4L0 6L4.6 4.6Z" fill="hsl(' + hue + ',70%,70%)" opacity="0.9"/></svg>';
    el.style.left = 'calc(50% + ' + xOffset + 'px)';
    el.style.bottom = '24px';
    el.style.animation = animName + ' 0.7s ease-out ' + delay + 'ms forwards';
    container.appendChild(el);
    setTimeout(function(e) { e.remove(); }, 900 + delay, el);
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

  show(showOnHover: boolean): void {
    this.showOnHover = showOnHover;

    if (this.window && !this.window.isDestroyed()) {
      if (!showOnHover) {
        this.window.showInactive();
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
      }
    });
  }

  hide(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
    }
    this.window = null;
    this.contentReady = false;
    this.pendingUpdate = null;
    this.currentState = "idle";
  }

  setState(state: HudState): void {
    this.currentState = state;
    if (!this.window || this.window.isDestroyed()) return;
    if (this.contentReady) {
      this.execSetState(state);
    } else {
      this.pendingUpdate = { state };
    }
  }

  triggerSparkles(direction: "up" | "down"): void {
    if (!this.window || this.window.isDestroyed() || !this.contentReady) return;
    this.window.webContents.executeJavaScript(
      `spawnSparkles("${direction}")`
    ).catch(() => {});
  }

  isVisible(): boolean {
    return this.window !== null && !this.window.isDestroyed();
  }

  setHoverVisible(visible: boolean): void {
    if (!this.showOnHover || !this.window || this.window.isDestroyed()) return;
    if (visible) {
      this.window.showInactive();
    } else if (this.currentState === "idle") {
      this.window.hide();
    }
  }

  private positionWindow(): void {
    if (!this.window) return;
    const cursorPoint = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(cursorPoint);
    const workArea = display.workArea;
    const x = Math.round(workArea.x + workArea.width / 2 - HUD_WIDTH / 2);
    const y = workArea.y + workArea.height - HUD_HEIGHT - DOCK_MARGIN;
    this.window.setPosition(x, y);
  }

  private sendTitles(): void {
    if (!this.window || this.window.isDestroyed() || !this.contentReady) return;
    const titles = {
      main: t("hud.startRecording"),
      stop: t("hud.stopRecording"),
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
      : "hud.stopRecording";
    const titles = {
      main: t(titleKey),
      cancel: t("hud.cancelRecording"),
    };
    this.window.webContents.executeJavaScript(
      `setState("${state}", ${JSON.stringify(titles)})`
    ).catch(() => {});
  }
}
