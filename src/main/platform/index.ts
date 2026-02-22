import type { PasterModule, PermissionsModule } from "./types";

let _paster: PasterModule | null = null;
let _permissions: PermissionsModule | null = null;

function loadPaster(): PasterModule {
  if (!_paster) {
    if (process.platform === "win32") {
      _paster = require("./win32/paster");
    } else {
      _paster = require("./darwin/paster");
    }
  }
  return _paster!;
}

function loadPermissions(): PermissionsModule {
  if (!_permissions) {
    if (process.platform === "win32") {
      _permissions = require("./win32/permissions");
    } else {
      _permissions = require("./darwin/permissions");
    }
  }
  return _permissions!;
}

export const paster: PasterModule = new Proxy({} as PasterModule, {
  get(_target, prop: string) {
    const mod = loadPaster();
    return (mod as unknown as Record<string, unknown>)[prop];
  },
});

export const permissions: PermissionsModule = new Proxy({} as PermissionsModule, {
  get(_target, prop: string) {
    const mod = loadPermissions();
    return (mod as unknown as Record<string, unknown>)[prop];
  },
});

export { applyCase, stripTrailingPeriod } from "./utils";
export type { PasteOptions, PasterModule, PermissionsModule } from "./types";
