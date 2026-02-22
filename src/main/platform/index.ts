import type { PasterModule, PermissionsModule } from "./types";

const os = process.platform;

export const paster: PasterModule = require(`./${os}/paster`);
export const permissions: PermissionsModule = require(`./${os}/permissions`);

export { applyCase, stripTrailingPeriod } from "./utils";
export type { PasteOptions, PasterModule, PermissionsModule } from "./types";
