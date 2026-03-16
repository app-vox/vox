import type { DisplayModule } from "../types";

export const homeWindowOptions: DisplayModule["homeWindowOptions"] = {
  frame: false,
};

export const hudWindowOptions: DisplayModule["hudWindowOptions"] = {};

export const appMenuPlatformItems: DisplayModule["appMenuPlatformItems"] = [];

export const supportsHideOnClose: DisplayModule["supportsHideOnClose"] = false;

export const defaultShortcuts: DisplayModule["defaultShortcuts"] = {
  hold: "Alt+Space",
  toggle: "Alt+Shift+Space",
};
