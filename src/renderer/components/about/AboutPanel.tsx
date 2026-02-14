import { useState, useEffect } from "react";
import type { UpdateState } from "../../../preload/index";
import { useT } from "../../i18n-context";
import card from "../shared/card.module.scss";
import styles from "./AboutPanel.module.scss";

export function AboutPanel() {
  const t = useT();
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

  const openIssueTracker = () => {
    window.voxApi.shell.openExternal("https://github.com/app-vox/vox/issues");
  };

  const isDevMode = import.meta.env.DEV;

  const status = updateState?.status ?? "idle";
  const checking = status === "checking";
  const showUpdateBanner = (status === "available" || status === "downloading" || status === "ready") && !dismissed;

  return (
    <div className={card.card}>
      <div className={`${card.header} ${styles.aboutHeader}`}>
        <div>
          <h2>{t("general.about.title")}</h2>
          <p className={card.description}>
            {currentVersion ? `Vox v${currentVersion}` : t("general.about.versionInfo")}
          </p>
        </div>
        {logoUrl && (
          <img
            src={logoUrl}
            alt="Vox"
            className={styles.aboutLogo}
            draggable={false}
            onClick={() => window.voxApi.shell.openExternal("https://app-vox.github.io/vox/")}
            title={t("sidebar.visitWebsite")}
          />
        )}
      </div>
      <div className={card.body}>
        {showUpdateBanner ? (
          <>
            <div className={styles.updateBanner}>
              <div className={styles.updateBannerContent}>
                {status === "ready" ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span>{t("general.about.readyToInstall", { version: updateState?.latestVersion ?? "" })}</span>
                  </>
                ) : status === "downloading" ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <span>{t("general.about.downloading", { version: updateState?.latestVersion ?? "", progress: updateState?.downloadProgress ?? 0 })}</span>
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <span>{t("general.about.available", { version: updateState?.latestVersion ?? "" })}</span>
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
                    {t("general.about.restartNow")}
                  </button>
                ) : status === "available" && isDevMode && updateState?.releaseUrl ? (
                  <button
                    onClick={() => window.voxApi.shell.openExternal(updateState.releaseUrl)}
                    className={styles.downloadButton}
                  >
                    {t("general.about.download")}
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
            <button onClick={openIssueTracker} className={styles.reportIssueBelow}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{t("general.about.reportIssue")}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </button>
          </>
        ) : (
          <>
            <div className={styles.aboutActions}>
              <div className={styles.checkForUpdatesCol}>
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
                      <span>{t("general.about.checking")}</span>
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 4 23 10 17 10" />
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                      </svg>
                      <span>{t("general.about.checkForUpdates")}</span>
                    </>
                  )}
                </button>
                <div className={styles.updateStatus}>
                  {checking ? (
                    <span className={styles.updateChecking}>{t("general.about.checkingForUpdates")}</span>
                  ) : status === "idle" && updateState ? (
                    <span className={styles.upToDate}>{t("general.about.upToDate")}</span>
                  ) : status === "error" && updateState?.error ? (
                    <span className={styles.updateError}>{updateState.error}</span>
                  ) : null}
                </div>
              </div>
              <button onClick={openIssueTracker} className={styles.aboutButton}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{t("general.about.reportIssue")}</span>
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
  );
}
