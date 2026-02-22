import type { PasterModule, PermissionsModule } from "./types";
import * as darwinPaster from "./darwin/paster";
import * as darwinPermissions from "./darwin/permissions";
import * as win32Paster from "./win32/paster";
import * as win32Permissions from "./win32/permissions";

const platformPasters: Record<string, PasterModule> = {
  darwin: darwinPaster,
  win32: win32Paster,
};

const platformPermissions: Record<string, PermissionsModule> = {
  darwin: darwinPermissions,
  win32: win32Permissions,
};

export const paster: PasterModule = platformPasters[process.platform]!;
export const permissions: PermissionsModule = platformPermissions[process.platform]!;

export { applyCase, stripTrailingPeriod } from "./utils";
export type { PasteOptions, PasterModule, PermissionsModule } from "./types";
