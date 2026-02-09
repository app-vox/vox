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
let hasModel = true;

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

export function setTrayModelState(modelConfigured: boolean): void {
  hasModel = modelConfigured;
  updateTrayMenu();
}

function updateTrayMenu(): void {
  if (!tray || !callbacks) return;

  const menuTemplate: Electron.MenuItemConstructorOptions[] = [
    { label: "Show Vox", click: callbacks.onOpenHome },
  ];

  // Show different options based on recording state
  if (isListening) {
    // When recording, show stop and cancel options
    if (callbacks.onStopListening || callbacks.onCancelListening) {
      menuTemplate.push({ type: "separator" });
      if (callbacks.onStopListening) {
        menuTemplate.push({ label: "Complete Listening", click: callbacks.onStopListening, enabled: hasModel });
      }
      if (callbacks.onCancelListening) {
        menuTemplate.push({ label: "Cancel", click: callbacks.onCancelListening, enabled: hasModel });
      }
    }
  } else {
    // When idle, show start option
    if (callbacks.onStartListening) {
      menuTemplate.push({ type: "separator" });
      menuTemplate.push({ label: "Start Listening", click: callbacks.onStartListening, enabled: hasModel });
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
