import type { PasterModule, PermissionsModule } from "./types";

const os = process.platform;

let _paster: PasterModule | null = null;
let _permissions: PermissionsModule | null = null;

function loadPaster(): PasterModule {
  if (!_paster) _paster = require(`./${os}/paster`);
  return _paster!;
}

function loadPermissions(): PermissionsModule {
  if (!_permissions) _permissions = require(`./${os}/permissions`);
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
