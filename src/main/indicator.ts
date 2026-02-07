import { BrowserWindow, screen } from "electron";

type IndicatorMode = "listening" | "transcribing" | "correcting";

const LABELS: Record<IndicatorMode, { color: string; text: string; pulse: boolean }> = {
  listening:    { color: "#ff4444", text: "Listening...",    pulse: false },
  transcribing: { color: "#ffaa00", text: "Transcribing...", pulse: true },
  correcting:   { color: "#44aaff", text: "Correcting...",   pulse: true },
};

function buildHtml(mode: IndicatorMode): string {
  const { color, text, pulse } = LABELS[mode];
  const animation = pulse
    ? "animation: pulse 1s ease-in-out infinite;"
    : "animation: glow 1.5s ease-in-out infinite;";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: transparent; overflow: hidden; }
  .pill {
    display: inline-flex; align-items: center; gap: 10px;
    padding: 10px 20px;
    background: rgba(20, 20, 20, 0.88);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-radius: 22px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    color: white; font-size: 14px; font-weight: 500;
    letter-spacing: 0.3px;
  }
  .dot {
    width: 12px; height: 12px;
    border-radius: 50%;
    background: ${color};
    box-shadow: 0 0 8px ${color};
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

    this.window = new BrowserWindow({
      width: 200,
      height: 44,
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
    const x = Math.round(display.bounds.width / 2 - 100);
    this.window.setPosition(x, 40);

    this.window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildHtml(mode))}`);

    // showInactive() displays the window without stealing focus
    this.window.once("ready-to-show", () => {
      this.window?.showInactive();
    });
  }

  hide(): void {
    if (this.window) {
      this.window.close();
      this.window = null;
    }
  }
}
