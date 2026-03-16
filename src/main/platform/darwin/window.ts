import type { DisplayModule } from "../types";

export const homeWindowOptions: DisplayModule["homeWindowOptions"] = {
  titleBarStyle: "hiddenInset",
};

export const hudWindowOptions: DisplayModule["hudWindowOptions"] = {
  type: "panel",
};

export const appMenuPlatformItems: DisplayModule["appMenuPlatformItems"] = [
  { type: "separator" },
  { role: "services" },
  { type: "separator" },
  { role: "hide" },
  { role: "hideOthers" },
  { role: "unhide" },
];

export const supportsHideOnClose: DisplayModule["supportsHideOnClose"] = true;

export const defaultShortcuts: DisplayModule["defaultShortcuts"] = {
  hold: "Alt+Space",
  toggle: "Alt+Shift+Space",
};
