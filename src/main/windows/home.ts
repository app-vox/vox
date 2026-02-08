import { app, BrowserWindow, nativeTheme } from "electron";
import * as path from "path";

let homeWindow: BrowserWindow | null = null;

export function openHome(onClosed: () => void): void {
  if (homeWindow) {
    homeWindow.focus();
    return;
  }

  homeWindow = new BrowserWindow({
    width: 640,
    height: 840,
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
