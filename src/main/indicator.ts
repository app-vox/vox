import { BrowserWindow, screen } from "electron";

type IndicatorMode = "listening" | "transcribing" | "enhancing" | "error" | "canceled";

const LABELS: Record<IndicatorMode, { color: string; text: string; pulse: boolean }> = {
  listening:    { color: "#ff4444", text: "Listening...",    pulse: false },
  transcribing: { color: "#ffaa00", text: "Transcribing...", pulse: true },
  enhancing:    { color: "#44aaff", text: "Enhancing...",    pulse: true },
  error:        { color: "#fbbf24", text: "Nothing heard",   pulse: false },
  canceled:     { color: "#fbbf24", text: "Canceled",        pulse: false },
};

function buildHtml(mode: IndicatorMode): string {
  const { color, text, pulse } = LABELS[mode];
  const animation = pulse
    ? "animation: pulse 1s ease-in-out infinite;"
    : "animation: glow 1.5s ease-in-out infinite;";

  const showXIcon = mode === "error" || mode === "canceled";
  const iconHtml = showXIcon
    ? `<svg class="icon" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
         <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="${color}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
       </svg>`
    : `<div class="dot"></div>`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
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
    padding: 10px 18px;
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
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.85); }
  }
  @keyframes glow {
    0%, 100% { ${showXIcon ? `filter: drop-shadow(0 0 8px ${color});` : `box-shadow: 0 0 8px ${color};`} }
    50% { ${showXIcon ? `filter: drop-shadow(0 0 16px ${color});` : `box-shadow: 0 0 16px ${color}, 0 0 24px ${color};`} }
  }
</style></head>
<body><div class="pill">${iconHtml}<span>${text}</span></div></body>
</html>`;
}

export class IndicatorWindow {
  private window: BrowserWindow | null = null;

  show(mode: IndicatorMode): void {
    // Always close existing window to avoid update issues
    if (this.window) {
      console.log(`[Vox] IndicatorWindow closing existing window before showing mode: ${mode}`);
      this.window.close();
      this.window = null;
    }

    console.log(`[Vox] IndicatorWindow creating new window for mode: ${mode}`);
    const estimatedWidth = mode === "error" ? 155 : 170;

    this.window = new BrowserWindow({
      width: estimatedWidth,
      height: 50,
      frame: false,
      transparent: true,
      hasShadow: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      focusable: false,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    this.window.setIgnoreMouseEvents(true);
    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    // Show overlay on the display where the cursor currently is
    const cursorPoint = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(cursorPoint);
    const x = Math.round(display.bounds.x + display.bounds.width / 2 - estimatedWidth / 2);
    this.window.setPosition(x, display.bounds.y + 20);

    this.window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildHtml(mode))}`);

    // showInactive() displays the window without stealing focus
    this.window.once("ready-to-show", () => {
      this.window?.showInactive();
    });
  }

  showError(durationMs = 3000, customText?: string): void {
    console.log("[Vox] IndicatorWindow.showError() called");
    if (customText) {
      this.showCustomError(customText, durationMs);
    } else {
      this.show("error");
      setTimeout(() => this.hide(), durationMs);
    }
  }

  private showCustomError(text: string, durationMs: number): void {
    if (this.window) {
      this.window.close();
      this.window = null;
    }

    const estimatedWidth = Math.max(205, text.length * 7.5);
    this.window = new BrowserWindow({
      width: estimatedWidth,
      height: 50,
      frame: false,
      transparent: true,
      hasShadow: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      focusable: false,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    this.window.setIgnoreMouseEvents(true);
    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    const cursorPoint = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(cursorPoint);
    const x = Math.round(display.bounds.x + display.bounds.width / 2 - estimatedWidth / 2);
    this.window.setPosition(x, display.bounds.y + 20);

    const html = this.buildCustomErrorHtml(text);
    this.window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    this.window.once("ready-to-show", () => {
      this.window?.showInactive();
    });

    setTimeout(() => this.hide(), durationMs);
  }

  private buildCustomErrorHtml(text: string): string {
    const color = "#fbbf24";
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
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
    padding: 10px 18px;
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
    setTimeout(() => this.hide(), durationMs);
  }

  hide(): void {
    if (this.window) {
      this.window.close();
      this.window = null;
    }
  }
}
