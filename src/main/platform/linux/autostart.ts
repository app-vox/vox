import { app } from "electron";
import * as fs from "fs";
import * as path from "path";
import log from "electron-log/main";
import type { AutostartModule } from "../types";

const slog = log.scope("Autostart");

function getDesktopFilePath(): string {
  const configDir = process.env.XDG_CONFIG_HOME || path.join(process.env.HOME || "~", ".config");
  return path.join(configDir, "autostart", "vox.desktop");
}

function getExecPath(): string {
  return process.env.APPIMAGE || app.getPath("exe");
}

export const setEnabled: AutostartModule["setEnabled"] = (enabled) => {
  const filePath = getDesktopFilePath();

  if (enabled) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const content = [
      "[Desktop Entry]",
      "Type=Application",
      `Name=${app.getName()}`,
      `Exec=${getExecPath()} --hidden`,
      "Icon=vox",
      "X-GNOME-Autostart-enabled=true",
      "",
    ].join("\n");

    fs.writeFileSync(filePath, content);
    slog.info("Autostart enabled:", filePath);
  } else {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      slog.info("Autostart disabled:", filePath);
    }
  }
};

export const isEnabled: AutostartModule["isEnabled"] = () => {
  return fs.existsSync(getDesktopFilePath());
};
