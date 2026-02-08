import { app, BrowserWindow } from "electron";
import * as path from "path";

let homeWindow: BrowserWindow | null = null;

export function openHome(onClosed: () => void): void {
  if (homeWindow) {
    homeWindow.focus();
    return;
  }

  homeWindow = new BrowserWindow({
    width: 580,
    height: 720,
    minWidth: 520,
    minHeight: 640,
    title: "Vox",
    titleBarStyle: "hiddenInset",
    backgroundColor: "#0a0a0a",
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
