// Shared flag used by lifecycle handlers to detect when
// autoUpdater.quitAndInstall() is in progress.  Lives in its own module to
// avoid circular imports between updater.ts and window modules.

let updating = false;

export function isUpdating(): boolean {
  return updating;
}

export function setUpdating(value: boolean): void {
  updating = value;
}
