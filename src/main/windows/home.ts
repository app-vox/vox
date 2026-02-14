import { app, BrowserWindow, Menu, nativeTheme, screen } from "electron";
import * as path from "path";

function setAppMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    { role: "appMenu" },
    { role: "fileMenu" },
    { role: "editMenu" },
    ...(!app.isPackaged ? [{ role: "viewMenu" as const }] : []),
    { role: "windowMenu" },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

let homeWindow: BrowserWindow | null = null;

export function openHome(onClosed: () => void, initialTab?: string): void {
  if (homeWindow) {
    if (homeWindow.isDestroyed()) {
      homeWindow = null;
    } else {
      if (homeWindow.isMinimized()) homeWindow.restore();
      homeWindow.show();
      homeWindow.focus();
      if (initialTab) {
        homeWindow.webContents.send("navigate-tab", initialTab);
      }
      return;
    }
  }

  const cursorPoint = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursorPoint);

  const WINDOW_WIDTH = 940;
  const WINDOW_HEIGHT = 860;
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
    maximizable: false,
    fullscreenable: false,
    title: "Vox",
    titleBarStyle: "hiddenInset",
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#0a0a0a" : "#ffffff",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      devTools: !app.isPackaged,
      preload: path.join(__dirname, "../preload/index.js"),
    },
  });

  setAppMenu();

  if (!app.isPackaged && process.env["ELECTRON_RENDERER_URL"]) {
    homeWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    homeWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  if (initialTab) {
    homeWindow.webContents.once("did-finish-load", () => {
      homeWindow?.webContents.send("navigate-tab", initialTab);
    });
  }

  if (app.isPackaged) {
    homeWindow.webContents.on("before-input-event", (event, input) => {
      if ((input.meta || input.control) && input.key.toLowerCase() === "r") {
        event.preventDefault();
        console.log("[Vox] Reload blocked in production mode");
      }
    });
  }

  homeWindow.webContents.on("before-input-event", (event, input) => {
    if ((input.meta || input.control) && (input.key === "=" || input.key === "-" || input.key === "0" || input.key === "+" || input.key === "_")) {
      event.preventDefault();
    }
  });

  homeWindow.webContents.on("context-menu", (_event, params) => {
    if (params.isEditable || params.selectionText) {
      const menu = Menu.buildFromTemplate([
        { role: "undo", enabled: params.editFlags.canUndo },
        { role: "redo", enabled: params.editFlags.canRedo },
        { type: "separator" },
        { role: "cut", enabled: params.editFlags.canCut },
        { role: "copy", enabled: params.editFlags.canCopy },
        { role: "paste", enabled: params.editFlags.canPaste },
        { role: "selectAll", enabled: params.editFlags.canSelectAll },
      ]);
      menu.popup();
    }
  });

  homeWindow.on("closed", () => {
    homeWindow = null;
    onClosed();
  });
}
