import { app, BrowserWindow, nativeTheme, screen } from "electron";
import * as path from "path";

let homeWindow: BrowserWindow | null = null;

export function openHome(onClosed: () => void): void {
  if (homeWindow) {
    homeWindow.show();
    homeWindow.focus();
    return;
  }

  const cursorPoint = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursorPoint);

  const WINDOW_WIDTH = 715;
  const WINDOW_HEIGHT = 775;
  const windowWidth = WINDOW_WIDTH;
  const windowHeight = WINDOW_HEIGHT;
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

  if (app.isPackaged) {
    homeWindow.webContents.on("before-input-event", (event, input) => {
      if ((input.meta || input.control) && input.key.toLowerCase() === "r") {
        event.preventDefault();
        console.log("[Vox] Reload blocked in production mode");
      }
    });
  }

  homeWindow.on("closed", () => {
    homeWindow = null;
    onClosed();
  });
}
