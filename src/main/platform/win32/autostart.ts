import { app } from "electron";
import type { AutostartModule } from "../types";

export const setEnabled: AutostartModule["setEnabled"] = (enabled) => {
  app.setLoginItemSettings({ openAtLogin: enabled, openAsHidden: false });
};

export const isEnabled: AutostartModule["isEnabled"] = () => {
  return app.getLoginItemSettings().openAtLogin;
};
