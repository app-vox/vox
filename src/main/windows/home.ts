import { app, BrowserWindow, nativeTheme, screen } from "electron";
import * as path from "path";

let homeWindow: BrowserWindow | null = null;

export function openHome(onClosed: () => void): void {
  if (homeWindow) {
    homeWindow.focus();
    return;
  }

  // Get the display where the cursor currently is
  const cursorPoint = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursorPoint);

  // Calculate centered position on the active display
  const windowWidth = 640;
  const windowHeight = 840;
  const x = Math.round(display.bounds.x + (display.bounds.width - windowWidth) / 2);
  const y = Math.round(display.bounds.y + (display.bounds.height - windowHeight) / 2);

  homeWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x,
    y,
    resizable: false,
    title: "Vox",
    titleBarStyle: "hiddenInset",
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#0a0a0a" : "#ffffff",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, "../preload/index.js"),
    },
  });

  if (!app.isPackaged && process.env["ELECTRON_RENDERER_URL"]) {
    homeWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    homeWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  homeWindow.on("closed", () => {
    homeWindow = null;
    onClosed();
  });
}
