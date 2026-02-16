import { BrowserWindow, screen } from "electron";
import { t } from "../shared/i18n";
import type { WidgetPosition } from "../shared/config";

type IndicatorMode = "initializing" | "listening" | "transcribing" | "enhancing" | "error" | "canceled";

const INDICATOR_KEYS: Record<IndicatorMode, string> = {
  initializing: "indicator.initializing",
  listening: "indicator.listening",
  transcribing: "indicator.transcribing",
  enhancing: "indicator.enhancing",
  error: "indicator.nothingHeard",
  canceled: "indicator.canceled",
};

interface ModeConfig {
  color: string;
  icon: "spinner" | "waveform" | "dot" | "x-icon";
  showLabel: boolean;
  showCancel: boolean;
  animation: "none" | "pulse" | "glow";
}

const MODE_CONFIG: Record<IndicatorMode, ModeConfig> = {
  initializing: { color: "#888888", icon: "spinner", showLabel: false, showCancel: true, animation: "none" },
  listening:    { color: "#ff4444", icon: "waveform", showLabel: false, showCancel: true, animation: "none" },
  transcribing: { color: "#ffaa00", icon: "dot", showLabel: true, showCancel: true, animation: "pulse" },
  enhancing:    { color: "#44aaff", icon: "dot", showLabel: true, showCancel: false, animation: "pulse" },
  error:        { color: "#fbbf24", icon: "x-icon", showLabel: true, showCancel: false, animation: "glow" },
  canceled:     { color: "#fbbf24", icon: "x-icon", showLabel: true, showCancel: false, animation: "glow" },
};

const WINDOW_WIDTH = 300;
const WINDOW_HEIGHT = 80;

function buildStaticHtml(): string {
  const bars = Array.from({ length: 12 }, (_, i) =>
    `<div class="bar" data-index="${i}"></div>`
  ).join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  :root { --c: #888; }
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
  .pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 6px 12px;
    background: rgba(25, 25, 25, 0.95);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2);
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
    color: rgba(255, 255, 255, 0.95);
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.1px;
    white-space: nowrap;
    pointer-events: auto;
    cursor: grab;
    min-width: 100px;
    min-height: 30px;
  }
  .pill.dragging { cursor: grabbing; }
  .hidden { display: none !important; }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .x-icon { flex-shrink: 0; }
  .spinner {
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-top-color: #888;
    border-radius: 50%;
    flex-shrink: 0;
    animation: spin 0.8s linear infinite;
  }
  .waveform {
    display: flex;
    align-items: center;
    gap: 2px;
    height: 16px;
  }
  .bar {
    width: 3px;
    min-height: 3px;
    height: 3px;
    border-radius: 1.5px;
    transition: height 0.05s ease;
  }
  .cancel-btn {
    pointer-events: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease;
    flex-shrink: 0;
    margin-left: 2px;
  }
  .cancel-btn:hover { background: #ef4444; color: white; }
  .anim-pulse { animation: pulse 1s ease-in-out infinite; }
  .anim-glow-icon { animation: glowIcon 1.5s ease-in-out infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.85); }
  }
  @keyframes glowIcon {
    0%, 100% { filter: drop-shadow(0 0 8px var(--c)); }
    50% { filter: drop-shadow(0 0 16px var(--c)); }
  }
  .pill.highlight { border-color: rgba(99, 102, 241, 0.6); box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3), 0 8px 32px rgba(0, 0, 0, 0.4); }
</style></head>
<body>
<div class="pill">
  <div class="spinner hidden" id="spinner"></div>
  <div class="waveform hidden" id="waveform">${bars}</div>
  <div class="dot hidden" id="dot"></div>
  <svg class="x-icon hidden" id="x-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path id="x-path" d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
  <span class="hidden" id="label"></span>
  <button class="cancel-btn" id="cancel-btn" style="display:none" onclick="window.electronAPI?.cancelRecording()">
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 2L2 8M2 2L8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>
</div>
<script>
var isDragging = false;
var dragStartX = 0, dragStartY = 0;
var pillEl = null;

document.addEventListener('DOMContentLoaded', function() {
  pillEl = document.querySelector('.pill');
  pillEl.addEventListener('mousedown', function(e) {
    if (e.target.closest('.cancel-btn')) return;
    isDragging = true;
    dragStartX = e.screenX;
    dragStartY = e.screenY;
    pillEl.classList.add('dragging');
    e.preventDefault();
  });
});

document.addEventListener('mousemove', function(e) {
  if (!isDragging) return;
  var dx = e.screenX - dragStartX;
  var dy = e.screenY - dragStartY;
  if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
    window.electronAPI?.indicatorDrag(dx, dy);
    dragStartX = e.screenX;
    dragStartY = e.screenY;
  }
});

document.addEventListener('mouseup', function() {
  if (!isDragging) return;
  isDragging = false;
  if (pillEl) pillEl.classList.remove('dragging');
  window.electronAPI?.indicatorDragEnd();
});

function setMode(cfg) {
  var c = cfg.color;
  document.documentElement.style.setProperty('--c', c);

  ['spinner','waveform','dot','x-icon'].forEach(function(id) {
    document.getElementById(id).classList.add('hidden');
  });

  var el = document.getElementById(cfg.icon);
  el.classList.remove('hidden');

  var dot = document.getElementById('dot');
  dot.style.background = c;
  dot.style.boxShadow = '0 0 8px ' + c;
  dot.className = cfg.icon === 'dot'
    ? 'dot' + (cfg.animation === 'pulse' ? ' anim-pulse' : '')
    : 'dot hidden';

  var xi = document.getElementById('x-icon');
  xi.querySelector('path').setAttribute('stroke', c);
  xi.style.filter = 'drop-shadow(0 0 8px ' + c + ')';
  if (cfg.icon === 'x-icon') {
    xi.className = 'x-icon' + (cfg.animation === 'glow' ? ' anim-glow-icon' : '');
  } else {
    xi.className = 'x-icon hidden';
  }

  document.querySelectorAll('.bar').forEach(function(bar) {
    bar.style.background = c;
    bar.style.boxShadow = '0 0 4px ' + c;
    bar.style.height = '3px';
  });

  var label = document.getElementById('label');
  if (cfg.showLabel && cfg.labelText) {
    label.textContent = cfg.labelText;
    label.classList.remove('hidden');
  } else {
    label.classList.add('hidden');
  }

  var cb = document.getElementById('cancel-btn');
  cb.style.display = cfg.showCancel ? 'flex' : 'none';
}
</script>
</body></html>`;
}

export class IndicatorWindow {
  private window: BrowserWindow | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private contentReady = false;
  private pendingUpdate: object | null = null;
  private currentMode: IndicatorMode | null = null;
  private overlayPosition: WidgetPosition = "top-center";
  private targetDisplayId: number | null = null;
  private customX = 0.5;
  private customY = 0.1;

  show(mode: IndicatorMode, customLabel?: string): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    const isInteractive = mode === "initializing" || mode === "listening" || mode === "transcribing";
    const config = MODE_CONFIG[mode];
    const labelText = customLabel ?? t(INDICATOR_KEYS[mode]);
    const update = { ...config, labelText };
    this.currentMode = mode;

    if (this.window && !this.window.isDestroyed()) {
      this.window.setIgnoreMouseEvents(false);
      if (this.contentReady) {
        this.execSetMode(update);
      } else {
        this.pendingUpdate = update;
      }
      return;
    }

    // First show — create the window
    this.contentReady = false;
    this.pendingUpdate = update;

    this.window = new BrowserWindow({
      width: WINDOW_WIDTH,
      height: WINDOW_HEIGHT,
      frame: false,
      transparent: true,
      hasShadow: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      focusable: false,
      type: "panel",
      acceptFirstMouse: false,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: require.resolve("../preload/index.js"),
      },
    });

    this.window.setIgnoreMouseEvents(!isInteractive);
    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    this.window.on("focus", () => {
      if (this.window) this.window.blur();
    });

    this.positionWindow();

    this.window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildStaticHtml())}`);

    this.window.webContents.on("did-finish-load", () => {
      this.contentReady = true;
      if (this.pendingUpdate) {
        this.execSetMode(this.pendingUpdate);
        this.pendingUpdate = null;
      }
    });

    this.window.once("ready-to-show", () => {
      this.window?.showInactive();
    });
  }

  sendAudioLevels(levels: number[]): void {
    if (!this.window || this.window.isDestroyed() || !this.contentReady) return;
    this.window.webContents.executeJavaScript(`
      (() => {
        const bars = document.querySelectorAll('.bar');
        const levels = ${JSON.stringify(levels)};
        bars.forEach((bar, i) => {
          const h = Math.max(3, levels[i] * 20);
          bar.style.height = h + 'px';
        });
      })()
    `).catch(() => {});
  }

  showError(durationMs = 3000, customText?: string): void {
    this.show("error", customText);
    const t = setTimeout(() => this.hide(), durationMs);
    t.unref();
    this.hideTimer = t;
  }

  showCanceled(durationMs = 1500): void {
    this.show("canceled");
    const t = setTimeout(() => this.hide(), durationMs);
    t.unref();
    this.hideTimer = t;
  }

  hide(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
    }
    this.window = null;
    this.contentReady = false;
    this.pendingUpdate = null;
    this.currentMode = null;
  }

  showPreview(): void {
    if (!this.window || this.window.isDestroyed()) {
      this.show("initializing");
    }
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  hidePreview(): void {
    if (this.window && !this.window.isDestroyed()) {
      const t = setTimeout(() => this.hide(), 300);
      t.unref();
      this.hideTimer = t;
    }
  }

  isVisible(): boolean {
    return this.window !== null && !this.window.isDestroyed();
  }

  getMode(): string | null {
    return this.currentMode;
  }

  setOverlayPosition(position: WidgetPosition, customX?: number, customY?: number): void {
    this.overlayPosition = position;
    if (customX !== undefined) this.customX = customX;
    if (customY !== undefined) this.customY = customY;
  }

  setTargetDisplay(id: number | null): void {
    this.targetDisplayId = id;
  }

  getTargetDisplay(): number | null {
    return this.targetDisplayId;
  }

  showHighlight(): void {
    if (!this.window || this.window.isDestroyed() || !this.contentReady) return;
    this.window.webContents.executeJavaScript(
      `document.querySelector('.pill').classList.add('highlight')`
    ).catch(() => {});
  }

  hideHighlight(): void {
    if (!this.window || this.window.isDestroyed() || !this.contentReady) return;
    this.window.webContents.executeJavaScript(
      `document.querySelector('.pill').classList.remove('highlight')`
    ).catch(() => {});
  }

  setPosition(nx: number, ny: number): void {
    this.customX = nx;
    this.customY = ny;
    this.overlayPosition = "custom";
    this.positionWindow();
  }

  drag(dx: number, dy: number): void {
    if (!this.window || this.window.isDestroyed()) return;
    const [wx, wy] = this.window.getPosition();
    this.window.setPosition(wx + dx, wy + dy);
  }

  dragEnd(): { nx: number; ny: number } | null {
    if (!this.window || this.window.isDestroyed()) return null;
    const [wx, wy] = this.window.getPosition();
    const display = screen.getDisplayNearestPoint({ x: wx + WINDOW_WIDTH / 2, y: wy + WINDOW_HEIGHT / 2 });
    const nx = (wx + WINDOW_WIDTH / 2 - display.bounds.x) / display.bounds.width;
    const ny = (wy + WINDOW_HEIGHT / 2 - display.bounds.y) / display.bounds.height;
    this.customX = nx;
    this.customY = ny;
    this.overlayPosition = "custom";
    return { nx, ny };
  }

  private positionWindow(): void {
    if (!this.window) return;
    const display = this.targetDisplayId !== null
      ? screen.getAllDisplays().find(d => d.id === this.targetDisplayId) ?? screen.getPrimaryDisplay()
      : screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    const workArea = display.workArea;

    if (this.overlayPosition === "custom") {
      const x = Math.round(display.bounds.x + display.bounds.width * this.customX - WINDOW_WIDTH / 2);
      const y = Math.round(display.bounds.y + display.bounds.height * this.customY - WINDOW_HEIGHT / 2);
      this.window.setPosition(x, y);
      return;
    }

    const [vPos, hPos] = this.overlayPosition.split("-") as [string, string];
    let x: number;
    if (hPos === "left") {
      x = workArea.x + 10;
    } else if (hPos === "right") {
      x = workArea.x + workArea.width - WINDOW_WIDTH - 10;
    } else {
      x = Math.round(display.bounds.x + display.bounds.width / 2 - WINDOW_WIDTH / 2);
    }
    const y = vPos === "bottom"
      ? workArea.y + workArea.height - WINDOW_HEIGHT - 10
      : vPos === "center"
      ? Math.round(workArea.y + workArea.height / 2 - WINDOW_HEIGHT / 2)
      : display.bounds.y + 10;
    this.window.setPosition(x, y);
  }

  private execSetMode(update: object): void {
    if (!this.window || this.window.isDestroyed()) return;
    this.window.webContents.executeJavaScript(
      `setMode(${JSON.stringify(update)})`
    ).catch(() => {});
  }
}
