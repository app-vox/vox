import { app } from "electron";
import * as path from "path";

export function getResourcePath(...segments: string[]): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "resources", ...segments)
    : path.join(__dirname, "../../resources", ...segments);
}
