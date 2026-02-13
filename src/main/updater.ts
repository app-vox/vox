import { app, BrowserWindow } from "electron";
import { autoUpdater, type UpdateInfo, type ProgressInfo } from "electron-updater";

export interface UpdateState {
  status: "idle" | "checking" | "available" | "downloading" | "ready" | "error";
  currentVersion: string;
  latestVersion: string;
  releaseUrl: string;
  downloadProgress: number;
  error: string;
}

let state: UpdateState = {
  status: "idle",
  currentVersion: "",
  latestVersion: "",
  releaseUrl: "",
  downloadProgress: 0,
  error: "",
};

let onStateChangeCallback: (() => void) | null = null;

function setState(patch: Partial<UpdateState>): void {
  state = { ...state, ...patch };
  broadcastState();
  onStateChangeCallback?.();
}

function broadcastState(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send("updates:state-changed", state);
  }
}

// --- Dev mode fallback (always up-to-date) ---

async function devCheckForUpdates(): Promise<void> {
  const currentVersion = app.getVersion();

  setState({ status: "checking", currentVersion });

  // Simulate a brief check, but always resolve as up-to-date in dev mode
  await new Promise((resolve) => setTimeout(resolve, 600));

  setState({
    status: "idle",
    currentVersion,
    latestVersion: currentVersion,
    releaseUrl: "",
  });
}

// --- Production mode (electron-updater) ---

function setupAutoUpdater(): void {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    setState({ status: "checking" });
  });

  autoUpdater.on("update-available", (info: UpdateInfo) => {
    setState({
      status: "available",
      latestVersion: info.version,
      releaseUrl: `https://github.com/app-vox/vox/releases/tag/v${info.version}`,
    });
  });

  autoUpdater.on("update-not-available", () => {
    setState({ status: "idle" });
  });

  autoUpdater.on("download-progress", (progress: ProgressInfo) => {
    setState({
      status: "downloading",
      downloadProgress: Math.round(progress.percent),
    });
  });

  autoUpdater.on("update-downloaded", (info: UpdateInfo) => {
    setState({
      status: "ready",
      latestVersion: info.version,
      downloadProgress: 100,
    });
  });

  autoUpdater.on("error", (err: Error) => {
    setState({
      status: "error",
      error: err.message,
    });
  });
}

// --- Public API ---

export function initAutoUpdater(onStateChange?: () => void): void {
  onStateChangeCallback = onStateChange ?? null;
  state.currentVersion = app.getVersion();

  if (app.isPackaged) {
    setupAutoUpdater();
    autoUpdater.checkForUpdates();
  } else {
    devCheckForUpdates();
  }
}

export async function checkForUpdates(): Promise<void> {
  if (app.isPackaged) {
    await autoUpdater.checkForUpdates();
  } else {
    await devCheckForUpdates();
  }
}

export function getUpdateState(): UpdateState {
  return state;
}

export function quitAndInstall(): void {
  if (app.isPackaged) {
    autoUpdater.quitAndInstall();
  }
}
