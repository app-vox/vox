import { useState, useEffect, type ReactNode } from "react";
import { useConfigStore } from "../../stores/config-store";
import { useSaveToast } from "../../hooks/use-save-toast";
import type { ThemeMode } from "../../../shared/config";
import type { UpdateState } from "../../../preload/index";
import card from "../shared/card.module.scss";
import styles from "./GeneralPanel.module.scss";

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: ReactNode }[] = [
  {
    value: "light",
    label: "Light",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    ),
  },
  {
    value: "dark",
    label: "Dark",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ),
  },
  {
    value: "system",
    label: "System",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
];

export function GeneralPanel() {
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const saveConfig = useConfigStore((s) => s.saveConfig);
  const triggerToast = useSaveToast((s) => s.trigger);

  const [updateState, setUpdateState] = useState<UpdateState | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [currentVersion, setCurrentVersion] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    window.voxApi.updates.getVersion().then(setCurrentVersion);
    window.voxApi.updates.getState().then(setUpdateState);
    window.voxApi.resources.dataUrl("logo.png").then(setLogoUrl);
    const unsub = window.voxApi.updates.onStateChanged(setUpdateState);
    return unsub;
  }, []);

  const handleCheckForUpdates = async () => {
    setDismissed(false);
    await window.voxApi.updates.check();
  };

  const handleRestart = () => {
    window.voxApi.updates.quitAndInstall();
  };

  // Detect if running in dev mode
  const isDevMode = import.meta.env.DEV;

  if (!config) return null;

  const setTheme = async (theme: ThemeMode) => {
    updateConfig({ theme });
    await saveConfig(false);
    triggerToast();
  };

  const toggleLaunchAtLogin = async () => {
    if (isDevMode) return;
    updateConfig({ launchAtLogin: !config.launchAtLogin });
    await saveConfig(false);
    triggerToast();
  };

  const openIssueTracker = () => {
    window.voxApi.shell.openExternal("https://github.com/app-vox/vox/issues");
  };

  const status = updateState?.status ?? "idle";
  const checking = status === "checking";
  const showUpdateBanner = (status === "available" || status === "downloading" || status === "ready") && !dismissed;

  return (
    <>
      <div className={card.card}>
        <div className={card.header}>
          <h2>Theme</h2>
          <p className={card.description}>Choose your preferred appearance.</p>
        </div>
        <div className={card.body}>
          <div className={styles.segmented}>
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`${styles.segment} ${config.theme === opt.value ? styles.active : ""}`}
                onClick={() => setTheme(opt.value)}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={card.card}>
        <div className={card.header}>
          <h2>Startup</h2>
          <p className={card.description}>Control how Vox launches on your system.</p>
        </div>
        <div className={card.body}>
          <label className={`${styles.checkboxRow} ${isDevMode ? styles.disabled : ""}`}>
            <input
              type="checkbox"
              checked={config.launchAtLogin}
              disabled={isDevMode}
              onChange={toggleLaunchAtLogin}
            />
            <div>
              <div className={styles.checkboxLabel}>Launch at login</div>
              <div className={styles.checkboxDesc}>
                {isDevMode
                  ? "Disabled in development mode. This feature works only in the production build."
                  : "Automatically start Vox when you log in to your computer"
                }
              </div>
            </div>
          </label>
        </div>
      </div>

      <div className={card.card}>
        <div className={`${card.header} ${styles.aboutHeader}`}>
          <div>
            <h2>About</h2>
            <p className={card.description}>
              {currentVersion ? `Vox v${currentVersion}` : "Version information and support."}
            </p>
          </div>
          {logoUrl && <img src={logoUrl} alt="Vox" className={styles.aboutLogo} />}
        </div>
        <div className={card.body}>
          {showUpdateBanner ? (
            <div className={styles.updateBanner}>
              <div className={styles.updateBannerContent}>
                {status === "ready" ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span>Vox v{updateState?.latestVersion} is ready to install</span>
                  </>
                ) : status === "downloading" ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <span>Downloading Vox v{updateState?.latestVersion}... {updateState?.downloadProgress ?? 0}%</span>
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <span>Vox v{updateState?.latestVersion} is available</span>
                  </>
                )}
              </div>
              {status === "downloading" && (
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${updateState?.downloadProgress ?? 0}%` }}
                  />
                </div>
              )}
              <div className={styles.updateBannerActions}>
                {status === "ready" ? (
                  <button onClick={handleRestart} className={styles.downloadButton}>
                    Restart Now
                  </button>
                ) : status === "available" && isDevMode && updateState?.releaseUrl ? (
                  <button
                    onClick={() => window.voxApi.shell.openExternal(updateState.releaseUrl)}
                    className={styles.downloadButton}
                  >
                    Download
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </button>
                ) : null}
                <button onClick={() => setDismissed(true)} className={styles.dismissButton} aria-label="Dismiss">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <>
              {status === "idle" && updateState && !checking && (
                <div className={styles.statusMessage}>
                  <span className={styles.upToDate}>You're up to date</span>
                </div>
              )}
              {status === "error" && updateState?.error && (
                <div className={styles.statusMessage}>
                  <span className={styles.updateError}>{updateState.error}</span>
                </div>
              )}
              <div className={styles.aboutButtons}>
                <button
                  onClick={handleCheckForUpdates}
                  disabled={checking}
                  className={styles.aboutButton}
                >
                  {checking ? (
                    <>
                      <svg className={styles.spinner} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      <span>Checking...</span>
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 4 23 10 17 10" />
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                      </svg>
                      <span>Check for Updates</span>
                    </>
                  )}
                </button>
                <button onClick={openIssueTracker} className={styles.aboutButton}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>Report Issue</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
