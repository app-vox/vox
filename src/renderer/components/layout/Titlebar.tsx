import { useState, useEffect } from "react";
import type { UpdateState } from "../../../preload/index";
import { useConfigStore } from "../../stores/config-store";
import { useT } from "../../i18n-context";
import styles from "./Titlebar.module.scss";

const INFO_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const DOWNLOAD_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export function Titlebar() {
  const t = useT();
  const activeTab = useConfigStore((s) => s.activeTab);
  const setActiveTab = useConfigStore((s) => s.setActiveTab);
  const [updateState, setUpdateState] = useState<UpdateState | null>(null);

  useEffect(() => {
    window.voxApi.updates.getState().then(setUpdateState);
    const unsub = window.voxApi.updates.onStateChanged(setUpdateState);
    return unsub;
  }, []);

  const isDevMode = import.meta.env.DEV;
  const status = updateState?.status ?? "idle";

  const renderUpdateButton = () => {
    if (status === "ready") {
      return (
        <button
          className={`${styles.updateBtn} ${styles.updateBtnReady}`}
          onClick={() => window.voxApi.updates.quitAndInstall()}
        >
          {t("general.about.restartNow")}
        </button>
      );
    }

    if (status === "downloading") {
      return (
        <span className={styles.updateProgress}>
          {/* eslint-disable-next-line i18next/no-literal-string */}
          {`${Math.round(updateState?.downloadProgress ?? 0)}%`}
        </span>
      );
    }

    if (status === "available") {
      if (isDevMode && updateState?.releaseUrl) {
        return (
          <button
            className={styles.updateBtn}
            onClick={() => window.voxApi.shell.openExternal(updateState.releaseUrl)}
          >
            {DOWNLOAD_ICON}
            {t("sidebar.updateVox")}
          </button>
        );
      }
      return null;
    }

    return null;
  };

  return (
    <div className={styles.titlebar}>
      {renderUpdateButton()}
      <button
        className={`${styles.actionBtn} ${activeTab === "about" ? styles.actionBtnActive : ""}`}
        onClick={() => setActiveTab("about")}
        title={t("general.about.title")}
      >
        {INFO_ICON}
      </button>
    </div>
  );
}
