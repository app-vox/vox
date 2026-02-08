import { BrowserWindow, screen } from "electron";

type IndicatorMode = "listening" | "transcribing" | "correcting" | "error";

const LABELS: Record<IndicatorMode, { color: string; text: string; pulse: boolean }> = {
  listening:    { color: "#ff4444", text: "Listening...",    pulse: false },
  transcribing: { color: "#ffaa00", text: "Transcribing...", pulse: true },
  correcting:   { color: "#44aaff", text: "Correcting...",   pulse: true },
  error:        { color: "#ff6b6b", text: "No audio",        pulse: false },
};

function buildHtml(mode: IndicatorMode): string {
  const { color, text, pulse } = LABELS[mode];
  const animation = pulse
    ? "animation: pulse 1s ease-in-out infinite;"
    : "animation: glow 1.5s ease-in-out infinite;";

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
    gap: 10px;
    padding: 12px 20px;
    background: rgba(25, 25, 25, 0.95);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 24px;
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
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.85); }
  }
  @keyframes glow {
    0%, 100% { box-shadow: 0 0 8px ${color}; }
    50% { box-shadow: 0 0 16px ${color}, 0 0 24px ${color}; }
  }
</style></head>
<body><div class="pill"><div class="dot"></div><span>${text}</span></div></body>
</html>`;
}

export class IndicatorWindow {
  private window: BrowserWindow | null = null;

  show(mode: IndicatorMode): void {
    if (this.window) {
      // Update content via JS to avoid loadURL stealing focus
      const { color, text, pulse } = LABELS[mode];
      const animation = pulse
        ? "animation: pulse 1s ease-in-out infinite;"
        : "animation: glow 1.5s ease-in-out infinite;";
      this.window.webContents.executeJavaScript(`
        document.querySelector('.dot').style.cssText = 'width:12px;height:12px;border-radius:50%;background:${color};box-shadow:0 0 8px ${color};${animation}';
        document.querySelector('span').textContent = '${text}';
      `).catch(() => {});
      return;
    }

    // Use compact fixed width for error messages, dynamic for others
    const estimatedWidth = mode === "error" ? 140 : 180;

    this.window = new BrowserWindow({
      width: estimatedWidth,
      height: 48,
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

    const display = screen.getPrimaryDisplay();
    const x = Math.round(display.bounds.width / 2 - estimatedWidth / 2);
    this.window.setPosition(x, 20);

    this.window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildHtml(mode))}`);

    // showInactive() displays the window without stealing focus
    this.window.once("ready-to-show", () => {
      this.window?.showInactive();
    });
  }

  showError(durationMs = 3000): void {
    this.show("error");
    setTimeout(() => this.hide(), durationMs);
  }

  hide(): void {
    if (this.window) {
      this.window.close();
      this.window = null;
    }
  }
}
