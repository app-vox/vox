import { BrowserWindow } from "electron";

export class IndicatorWindow {
  private window: BrowserWindow | null = null;

  show(mode: "listening" | "processing"): void {
    if (this.window) {
      this.updateContent(mode);
      return;
    }

    this.window = new BrowserWindow({
      width: 160,
      height: 50,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      focusable: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    this.window.setIgnoreMouseEvents(true);

    // Position at top-center of screen
    const { screen } = require("electron");
    const display = screen.getPrimaryDisplay();
    const x = Math.round(display.bounds.width / 2 - 80);
    this.window.setPosition(x, 40);

    this.updateContent(mode);
  }

  hide(): void {
    if (this.window) {
      this.window.close();
      this.window = null;
    }
  }

  private updateContent(mode: "listening" | "processing"): void {
    if (!this.window) return;

    const isListening = mode === "listening";
    const dotStyle = isListening ? "background: #ff4444;" : "background: #ffaa00;";
    const animation = isListening ? "" : "animation: pulse 1s infinite;";
    const label = isListening ? "Listening..." : "Processing...";

    this.window.loadURL(`data:text/html,
      <html>
      <style>
        body {
          margin: 0; padding: 8px 16px;
          background: rgba(0,0,0,0.75);
          border-radius: 12px;
          display: flex; align-items: center; gap: 8px;
          font-family: -apple-system, sans-serif;
          color: white; font-size: 14px;
          -webkit-app-region: no-drag;
        }
        .dot {
          width: 10px; height: 10px;
          border-radius: 50%;
          ${dotStyle} ${animation}
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      </style>
      <body><div class="dot"></div><span>${label}</span></body>
      </html>
    `);
  }
}
