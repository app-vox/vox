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

// --- Dev mode fallback (manual GitHub API check) ---

const GITHUB_RELEASES_URL = "https://api.github.com/repos/app-vox/vox/releases?per_page=10";
const SEMVER_TAG_RE = /^v?\d+\.\d+\.\d+$/;
const CACHE_DURATION_MS = 15 * 60 * 1000;

let lastCheckTime = 0;
let cachedResult: { latestVersion: string; releaseUrl: string } | null = null;

function compareVersions(current: string, latest: string): number {
  const a = current.split(".").map(Number);
  const b = latest.split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (b[i] || 0) - (a[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

async function devCheckForUpdates(): Promise<void> {
  const currentVersion = app.getVersion();
  const now = Date.now();

  if (cachedResult && now - lastCheckTime < CACHE_DURATION_MS) {
    setState({ status: "checking", currentVersion });
    await new Promise(resolve => setTimeout(resolve, 800));
    const hasUpdate = compareVersions(currentVersion, cachedResult.latestVersion) > 0;
    setState({
      status: hasUpdate ? "available" : "idle",
      currentVersion,
      latestVersion: cachedResult.latestVersion,
      releaseUrl: cachedResult.releaseUrl,
    });
    return;
  }

  setState({ status: "checking", currentVersion });

  try {
    const response = await fetch(GITHUB_RELEASES_URL, {
      headers: { "User-Agent": `Vox/${currentVersion}` },
    });

    if (!response.ok) {
      if (response.status === 403 && cachedResult) {
        const hasUpdate = compareVersions(currentVersion, cachedResult.latestVersion) > 0;
        setState({
          status: hasUpdate ? "available" : "idle",
          currentVersion,
          latestVersion: cachedResult.latestVersion,
          releaseUrl: cachedResult.releaseUrl,
        });
        return;
      }

      const errorMessage = response.status === 403
        ? "GitHub API rate limit exceeded"
        : `GitHub API returned ${response.status}`;
      throw new Error(errorMessage);
    }

    const releases = (await response.json()) as {
      tag_name: string;
      html_url: string;
      draft: boolean;
      prerelease: boolean;
    }[];

    const latest = releases.find(
      (r) => !r.draft && !r.prerelease && SEMVER_TAG_RE.test(r.tag_name),
    );

    if (latest) {
      const latestVersion = latest.tag_name.replace(/^v/, "");
      const hasUpdate = compareVersions(currentVersion, latestVersion) > 0;

      cachedResult = {
        latestVersion,
        releaseUrl: latest.html_url,
      };
      lastCheckTime = now;

      setState({
        status: hasUpdate ? "available" : "idle",
        currentVersion,
        latestVersion,
        releaseUrl: latest.html_url,
      });
    } else {
      setState({
        status: "idle",
        currentVersion,
        latestVersion: currentVersion,
        releaseUrl: "https://github.com/app-vox/vox/releases",
      });
    }
  } catch (err: unknown) {
    setState({
      status: "error",
      currentVersion,
      error: err instanceof Error ? err.message : String(err),
    });
  }
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
