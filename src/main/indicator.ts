import { BrowserWindow, screen } from "electron";
import { t } from "../shared/i18n";

type IndicatorMode = "initializing" | "listening" | "transcribing" | "enhancing" | "error" | "canceled";

const INDICATOR_KEYS: Record<IndicatorMode, string> = {
  initializing: "indicator.initializing",
  listening: "indicator.listening",
  transcribing: "indicator.transcribing",
  enhancing: "indicator.enhancing",
  error: "indicator.nothingHeard",
  canceled: "indicator.canceled",
};

const INDICATOR_STYLES: Record<IndicatorMode, { color: string; pulse: boolean }> = {
  initializing: { color: "#888888", pulse: false },
  listening:    { color: "#ff4444", pulse: false },
  transcribing: { color: "#ffaa00", pulse: true },
  enhancing:    { color: "#44aaff", pulse: true },
  error:        { color: "#fbbf24", pulse: false },
  canceled:     { color: "#fbbf24", pulse: false },
};

function buildHtml(mode: IndicatorMode): string {
  const { color, pulse } = INDICATOR_STYLES[mode];
  const text = t(INDICATOR_KEYS[mode]);
  const animation = pulse
    ? "animation: pulse 1s ease-in-out infinite;"
    : "animation: glow 1.5s ease-in-out infinite;";

  const showXIcon = mode === "error" || mode === "canceled";
  const showSpinner = mode === "initializing";
  const showWaveform = mode === "listening";
  const showCancelButton = mode === "initializing" || mode === "listening" || mode === "transcribing";

  let iconHtml: string;
  if (showXIcon) {
    iconHtml = `<svg class="icon" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
         <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="${color}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
       </svg>`;
  } else if (showSpinner) {
    iconHtml = `<div class="spinner"></div>`;
  } else if (showWaveform) {
    iconHtml = `<div class="waveform">${Array.from({ length: 7 }, (_, i) => `<div class="bar" data-index="${i}"></div>`).join("")}</div>`;
  } else {
    iconHtml = `<div class="dot"></div>`;
  }

  const labelHtml = showWaveform ? "" : `<span>${text}</span>`;

  const cancelButtonHtml = showCancelButton
    ? `<button class="cancel-btn" onclick="window.electronAPI?.cancelRecording()">
         <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
           <path d="M8 2L2 8M2 2L8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
         </svg>
       </button>`
    : "";

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
  .pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    padding: 8px 14px;
    background: rgba(25, 25, 25, 0.95);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2);
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
    color: rgba(255, 255, 255, 0.95);
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.1px;
    white-space: nowrap;
    pointer-events: none;
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${color};
    box-shadow: 0 0 8px ${color};
    flex-shrink: 0;
    ${animation}
  }
  .icon {
    flex-shrink: 0;
    filter: drop-shadow(0 0 8px ${color});
    ${animation}
  }
  .spinner {
    width: 14px;
    height: 14px;
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
    height: 20px;
  }
  .bar {
    width: 3px;
    min-height: 3px;
    height: 3px;
    background: ${color};
    border-radius: 1.5px;
    box-shadow: 0 0 4px ${color};
    transition: height 0.05s ease;
  }
  .cancel-btn {
    pointer-events: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
    margin-left: 2px;
    user-select: none;
    -webkit-user-select: none;
  }
  .cancel-btn:hover {
    background: #ef4444;
    color: white;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.85); }
  }
  @keyframes glow {
    0%, 100% { ${showXIcon ? `filter: drop-shadow(0 0 8px ${color});` : `box-shadow: 0 0 8px ${color};`} }
    50% { ${showXIcon ? `filter: drop-shadow(0 0 16px ${color});` : `box-shadow: 0 0 16px ${color}, 0 0 24px ${color};`} }
  }
</style></head>
<body><div class="pill">${iconHtml}${labelHtml}${cancelButtonHtml}</div></body>
</html>`;
}

export class IndicatorWindow {
  private window: BrowserWindow | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  show(mode: IndicatorMode): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    if (this.window) {
      this.window.close();
      this.window = null;
    }

    const isInteractive = mode === "initializing" || mode === "listening" || mode === "transcribing";
    const estimatedWidth = mode === "error" ? 155 : mode === "canceled" ? 130 : 200;
    const windowWidth = estimatedWidth + 64;
    const windowHeight = 80;

    this.window = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      frame: false,
      transparent: true,
      hasShadow: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      focusable: false,
      type: 'panel',
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

    this.window.on('focus', () => {
      if (this.window) {
        this.window.blur();
      }
    });

    const cursorPoint = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(cursorPoint);
    const x = Math.round(display.bounds.x + display.bounds.width / 2 - windowWidth / 2);
    this.window.setPosition(x, display.bounds.y + 20);

    this.window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildHtml(mode))}`);

    this.window.once("ready-to-show", () => {
      this.window?.showInactive();
    });
  }

  sendAudioLevels(levels: number[]): void {
    if (!this.window || this.window.isDestroyed()) return;
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
    if (customText) {
      this.showCustomError(customText, durationMs);
    } else {
      this.show("error");
      this.hideTimer = setTimeout(() => this.hide(), durationMs);
    }
  }

  private showCustomError(text: string, durationMs: number): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    if (this.window) {
      this.window.close();
      this.window = null;
    }

    const estimatedWidth = Math.max(205, text.length * 7.5);
    const windowWidth = estimatedWidth + 64;
    const windowHeight = 80;

    this.window = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      frame: false,
      transparent: true,
      hasShadow: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      focusable: false,
      type: 'panel',
      acceptFirstMouse: false,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    this.window.setIgnoreMouseEvents(true);
    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    this.window.on('focus', () => {
      if (this.window) {
        this.window.blur();
      }
    });

    const cursorPoint = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(cursorPoint);
    const x = Math.round(display.bounds.x + display.bounds.width / 2 - windowWidth / 2);
    this.window.setPosition(x, display.bounds.y + 20);

    const html = this.buildCustomErrorHtml(text);
    this.window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    this.window.once("ready-to-show", () => {
      this.window?.showInactive();
    });

    this.hideTimer = setTimeout(() => this.hide(), durationMs);
  }

  private buildCustomErrorHtml(text: string): string {
    const color = "#fbbf24";
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
  .pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    padding: 8px 14px;
    background: rgba(25, 25, 25, 0.95);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2);
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
    color: rgba(255, 255, 255, 0.95);
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.1px;
    white-space: nowrap;
  }
  .icon {
    flex-shrink: 0;
    filter: drop-shadow(0 0 8px ${color});
    animation: glow 1.5s ease-in-out infinite;
  }
  @keyframes glow {
    0%, 100% { filter: drop-shadow(0 0 8px ${color}); }
    50% { filter: drop-shadow(0 0 16px ${color}); }
  }
</style></head>
<body><div class="pill">
  <svg class="icon" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="${color}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
  <span>${text}</span>
</div></body>
</html>`;
  }

  showCanceled(durationMs = 1500): void {
    this.show("canceled");
    this.hideTimer = setTimeout(() => this.hide(), durationMs);
  }

  hide(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    if (this.window) {
      this.window.close();
      this.window = null;
    }
  }
}
