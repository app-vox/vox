import { app, Tray, Menu, nativeImage } from "electron";
import { getResourcePath } from "./resources";

let tray: Tray | null = null;

export function setupTray(onOpenHome: () => void): void {
  const iconPath = getResourcePath("trayIcon.png");
  const icon = nativeImage.createFromPath(iconPath);
  icon.setTemplateImage(true);
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    { label: "Home", click: onOpenHome },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() },
  ]);

  tray.setContextMenu(contextMenu);
}
