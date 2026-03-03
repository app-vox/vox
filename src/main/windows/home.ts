import { app, BrowserWindow, ipcMain, Menu, nativeTheme, screen } from "electron";
import * as path from "path";
import log from "electron-log/main";
import { t } from "../../shared/i18n";
import { isUpdating } from "../update-state";

const slog = log.scope("Vox");

export interface AppMenuCallbacks {
  onShowVox: () => void;
  onTranscriptions: () => void;
  onSettings: () => void;
  onToggleHud: () => void;
  onCheckForUpdates: () => void;
  onOnboarding: () => void;
  isHudVisible: () => boolean;
}

let menuCallbacks: AppMenuCallbacks | null = null;

export function setAppMenuCallbacks(cb: AppMenuCallbacks): void {
  menuCallbacks = cb;
}

function buildAppMenu(): void {
  const hudVisible = menuCallbacks?.isHudVisible() ?? false;

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "Vox",
      submenu: [
        { role: "about" },
        { type: "separator" },
        {
          label: t("menu.checkForUpdates"),
          click: () => menuCallbacks?.onCheckForUpdates(),
        },
        { type: "separator" },
        {
          label: t("menu.visitOnboarding"),
          click: () => menuCallbacks?.onOnboarding(),
        },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: t("menu.file"),
      submenu: [
        {
          label: t("menu.showVox"),
          accelerator: "CmdOrCtrl+O",
          click: () => menuCallbacks?.onSettings(),
        },
        {
          label: t("menu.transcriptions"),
          accelerator: "CmdOrCtrl+T",
          click: () => menuCallbacks?.onTranscriptions(),
        },
        { type: "separator" },
        { role: "close" },
      ],
    },
    { role: "editMenu" },
    {
      label: t("menu.view"),
      submenu: [
        {
          label: t("menu.settings"),
          accelerator: "CmdOrCtrl+,",
          click: () => menuCallbacks?.onSettings(),
        },
        { type: "separator" },
        {
          label: hudVisible ? t("menu.hideHud") : t("menu.showHud"),
          click: () => menuCallbacks?.onToggleHud(),
        },
        ...(!app.isPackaged ? [
          { type: "separator" as const },
          { role: "reload" as const },
          { role: "forceReload" as const },
          { role: "toggleDevTools" as const },
        ] : []),
      ],
    },
    {
      label: t("menu.window"),
      submenu: [
        {
          label: t("menu.bringAllToFront"),
          click: () => {
            app.focus({ steal: true });
            menuCallbacks?.onShowVox();
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

export function refreshAppMenu(): void {
  buildAppMenu();
}

let homeWindow: BrowserWindow | null = null;
let forceQuit = false;
const isMac = process.platform === "darwin";

if (isMac) {
  app.on("before-quit", () => {
    forceQuit = true;
  });
}

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

  buildAppMenu();

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
        slog.debug("Reload blocked in production mode");
      }
    });
  }

  homeWindow.webContents.on("before-input-event", (event, input) => {
    if ((input.meta || input.control) && (input.key === "=" || input.key === "-" || input.key === "0" || input.key === "+" || input.key === "_")) {
      event.preventDefault();
    }
  });

  let shortcutRecording = false;
  ipcMain.on("shortcut-recorder:start", () => { shortcutRecording = true; });
  ipcMain.on("shortcut-recorder:stop", () => { shortcutRecording = false; });

  homeWindow.webContents.on("before-input-event", (_event, input) => {
    if (!shortcutRecording) return;
    if (input.type !== "keyDown") return;
    homeWindow?.webContents.send("shortcut-recorder:key", {
      code: input.code,
      key: input.key,
      alt: input.alt,
      shift: input.shift,
      control: input.control,
      meta: input.meta,
    });
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

  if (isMac) {
    homeWindow.on("close", (event) => {
      if (!forceQuit && !isUpdating()) {
        event.preventDefault();
        homeWindow?.hide();
      }
    });

    const BLUR_GRACE_MS = 400;
    let blurEnabled = false;
    let graceTimer: ReturnType<typeof setTimeout> | null = null;
    homeWindow.on("show", () => {
      blurEnabled = false;
      if (graceTimer) clearTimeout(graceTimer);
      graceTimer = setTimeout(() => { blurEnabled = true; }, BLUR_GRACE_MS);
    });
    homeWindow.on("hide", () => {
      blurEnabled = false;
      if (graceTimer) { clearTimeout(graceTimer); graceTimer = null; }
    });
    homeWindow.on("blur", () => {
      if (blurEnabled && !forceQuit && homeWindow && !homeWindow.isDestroyed()) {
        homeWindow.hide();
      }
    });
  }

  homeWindow.on("closed", () => {
    homeWindow = null;
    onClosed();
  });
}
