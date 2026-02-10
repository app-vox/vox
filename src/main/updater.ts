import { app } from "electron";
import * as fs from "fs";
import * as path from "path";

export interface UpdateStatus {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseUrl: string;
}

interface UpdateCheckData {
  lastCheckTimestamp: number;
}

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const GITHUB_RELEASES_URL = "https://api.github.com/repos/app-vox/vox/releases?per_page=10";
const SEMVER_TAG_RE = /^v?\d+\.\d+\.\d+$/;
const CHECK_FILE = "update-check.json";

let cachedStatus: UpdateStatus | null = null;

function getCheckFilePath(): string {
  return path.join(app.getPath("userData"), CHECK_FILE);
}

function readCheckData(): UpdateCheckData {
  try {
    const data = fs.readFileSync(getCheckFilePath(), "utf-8");
    return JSON.parse(data);
  } catch {
    return { lastCheckTimestamp: 0 };
  }
}

function writeCheckData(data: UpdateCheckData): void {
  try {
    fs.writeFileSync(getCheckFilePath(), JSON.stringify(data));
  } catch {
    // Silently ignore write errors
  }
}

function compareVersions(current: string, latest: string): number {
  const a = current.split(".").map(Number);
  const b = latest.split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (b[i] || 0) - (a[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export async function checkForUpdates(force = false): Promise<UpdateStatus> {
  const currentVersion = app.getVersion();

  if (!force) {
    const checkData = readCheckData();
    if (Date.now() - checkData.lastCheckTimestamp < COOLDOWN_MS && cachedStatus) {
      return cachedStatus;
    }
  }

  try {
    const response = await fetch(GITHUB_RELEASES_URL, {
      headers: { "User-Agent": `Vox/${currentVersion}` },
    });

    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}`);
    }

    const releases = (await response.json()) as { tag_name: string; html_url: string; draft: boolean; prerelease: boolean }[];

    // Find the first release with a semver tag (skip "latest" and other non-version tags)
    const latest = releases.find(
      (r) => !r.draft && !r.prerelease && SEMVER_TAG_RE.test(r.tag_name),
    );

    if (latest) {
      const latestVersion = latest.tag_name.replace(/^v/, "");
      cachedStatus = {
        updateAvailable: compareVersions(currentVersion, latestVersion) > 0,
        currentVersion,
        latestVersion,
        releaseUrl: latest.html_url,
      };
    } else {
      cachedStatus = {
        updateAvailable: false,
        currentVersion,
        latestVersion: currentVersion,
        releaseUrl: "https://github.com/app-vox/vox/releases",
      };
    }

    writeCheckData({ lastCheckTimestamp: Date.now() });
  } catch {
    // Network errors should not disrupt the app
    cachedStatus = cachedStatus ?? {
      updateAvailable: false,
      currentVersion,
      latestVersion: currentVersion,
      releaseUrl: "https://github.com/app-vox/vox/releases/latest",
    };
  }

  return cachedStatus;
}

export function getLastUpdateStatus(): UpdateStatus | null {
  return cachedStatus;
}
