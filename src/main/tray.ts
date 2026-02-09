import { app, Tray, Menu, nativeImage, shell } from "electron";
import { getResourcePath } from "./resources";

let tray: Tray | null = null;

export interface TrayCallbacks {
  onOpenHome: () => void;
  onStartListening?: () => void;
  onStopListening?: () => void;
  onCancelListening?: () => void;
}

let callbacks: TrayCallbacks | null = null;
let isListening = false;

export function setupTray(trayCallbacks: TrayCallbacks): void {
  callbacks = trayCallbacks;

  const iconPath = getResourcePath("trayIcon.png");
  const icon = nativeImage.createFromPath(iconPath);
  icon.setTemplateImage(true);
  tray = new Tray(icon);

  updateTrayMenu();
}

export function setTrayListeningState(listening: boolean): void {
  isListening = listening;
  updateTrayMenu();
}

function updateTrayMenu(): void {
  if (!tray || !callbacks) return;

  const menuTemplate: Electron.MenuItemConstructorOptions[] = [
    {
      label: "Show Settings",
      icon: nativeImage.createFromDataURL(
        "data:image/svg+xml;base64," +
          Buffer.from(
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
          ).toString("base64")
      ),
      click: callbacks.onOpenHome,
    },
  ];

  // Show different options based on recording state
  if (isListening) {
    // When recording, show stop and cancel options
    if (callbacks.onStopListening || callbacks.onCancelListening) {
      menuTemplate.push({ type: "separator" });
      if (callbacks.onStopListening) {
        menuTemplate.push({ label: "Complete Listening", click: callbacks.onStopListening });
      }
      if (callbacks.onCancelListening) {
        menuTemplate.push({ label: "Cancel", click: callbacks.onCancelListening });
      }
    }
  } else {
    // When idle, show start option
    if (callbacks.onStartListening) {
      menuTemplate.push({ type: "separator" });
      menuTemplate.push({ label: "Start Listening", click: callbacks.onStartListening });
    }
  }

  menuTemplate.push(
    { type: "separator" },
    { label: "Report Issue", click: () => shell.openExternal("https://github.com/app-vox/vox/issues") },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() }
  );

  const contextMenu = Menu.buildFromTemplate(menuTemplate);
  tray.setContextMenu(contextMenu);
}
