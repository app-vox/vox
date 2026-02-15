import { useState, useEffect } from "react";
import type { UpdateState } from "../../../preload/index";
import {
  CheckCircleIcon,
  InfoCircleIcon,
  ExternalLinkIcon,
  XIcon,
  SpinnerIcon,
  RefreshIcon,
  InfoCircleAltIcon,
} from "../../../shared/icons";
import { useDevOverrideValue } from "../../hooks/use-dev-override";
import { useT } from "../../i18n-context";
import card from "../shared/card.module.scss";
import styles from "./AboutPanel.module.scss";

export function AboutPanel() {
  const t = useT();
  const [updateState, setUpdateState] = useState<UpdateState | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [currentVersion, setCurrentVersion] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  // Dev overrides (gated — tree-shaken in production)
  const devUpdateStatus = import.meta.env.DEV
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useDevOverrideValue("updateStatus", undefined)
    : undefined;

  const devDownloadProgress = import.meta.env.DEV
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useDevOverrideValue("updateDownloadProgress", undefined)
    : undefined;

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

  const status = devUpdateStatus ?? updateState?.status ?? "idle";
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
                    <CheckCircleIcon width={16} height={16} />
                    <span>{t("general.about.readyToInstall", { version: updateState?.latestVersion ?? "" })}</span>
                  </>
                ) : status === "downloading" ? (
                  <>
                    <InfoCircleIcon width={16} height={16} />
                    <span>{t("general.about.downloading", { version: updateState?.latestVersion ?? "", progress: devDownloadProgress ?? updateState?.downloadProgress ?? 0 })}</span>
                  </>
                ) : (
                  <>
                    <InfoCircleIcon width={16} height={16} />
                    <span>{t("general.about.available", { version: updateState?.latestVersion ?? "" })}</span>
                  </>
                )}
              </div>
              {status === "downloading" ? (
                <div className={styles.progressRow}>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${devDownloadProgress ?? updateState?.downloadProgress ?? 0}%` }}
                    />
                  </div>
                  <button onClick={() => setDismissed(true)} className={styles.dismissButton} aria-label="Dismiss">
                    <XIcon width={14} height={14} />
                  </button>
                </div>
              ) : (
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
                      <ExternalLinkIcon width={14} height={14} />
                    </button>
                  ) : null}
                  <button onClick={() => setDismissed(true)} className={styles.dismissButton} aria-label="Dismiss">
                    <XIcon width={14} height={14} />
                  </button>
                </div>
              )}
            </div>
            <button onClick={openIssueTracker} className={styles.reportIssueBelow}>
              <InfoCircleAltIcon width={16} height={16} />
              <span>{t("general.about.reportIssue")}</span>
              <ExternalLinkIcon width={14} height={14} />
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
                      <SpinnerIcon className={styles.spinner} width={16} height={16} />
                      <span>{t("general.about.checking")}</span>
                    </>
                  ) : (
                    <>
                      <RefreshIcon width={16} height={16} />
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
                <InfoCircleAltIcon width={16} height={16} />
                <span>{t("general.about.reportIssue")}</span>
                <ExternalLinkIcon width={14} height={14} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
