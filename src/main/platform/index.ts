import type { PasterModule, PermissionsModule, WhisperModule, DisplayModule, AutostartModule } from "./types";
import * as darwinPaster from "./darwin/paster";
import * as darwinPermissions from "./darwin/permissions";
import * as darwinWhisper from "./darwin/whisper";
import * as darwinWindow from "./darwin/window";
import * as linuxPaster from "./linux/paster";
import * as linuxPermissions from "./linux/permissions";
import * as linuxWhisper from "./linux/whisper";
import * as linuxWindow from "./linux/window";
import * as win32Paster from "./win32/paster";
import * as win32Permissions from "./win32/permissions";
import * as win32Whisper from "./win32/whisper";
import * as win32Window from "./win32/window";
import * as darwinAutostart from "./darwin/autostart";
import * as linuxAutostart from "./linux/autostart";
import * as win32Autostart from "./win32/autostart";

const platformPasters: Record<string, PasterModule> = {
  darwin: darwinPaster,
  linux: linuxPaster,
  win32: win32Paster,
};

const platformPermissions: Record<string, PermissionsModule> = {
  darwin: darwinPermissions,
  linux: linuxPermissions,
  win32: win32Permissions,
};

const platformWhisper: Record<string, WhisperModule> = {
  darwin: darwinWhisper,
  linux: linuxWhisper,
  win32: win32Whisper,
};

const displays: Record<string, DisplayModule> = {
  darwin: darwinWindow,
  linux: linuxWindow,
  win32: win32Window,
};

const platformAutostart: Record<string, AutostartModule> = {
  darwin: darwinAutostart,
  linux: linuxAutostart,
  win32: win32Autostart,
};

export const paster: PasterModule = platformPasters[process.platform]!;
export const permissions: PermissionsModule = platformPermissions[process.platform]!;
export const whisper: WhisperModule = platformWhisper[process.platform]!;
export const display: DisplayModule = displays[process.platform]!;
export const autostart: AutostartModule = platformAutostart[process.platform]!;

export { applyCase, stripTrailingPeriod } from "./utils";
export type { PasteOptions, PasterModule, PermissionsModule, WhisperModule, DisplayModule, AutostartModule } from "./types";
