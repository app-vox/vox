import { useState, useEffect, lazy, Suspense } from "react";
import type { UpdateState } from "../../../preload/index";
import { useConfigStore } from "../../stores/config-store";
import { useSaveToast } from "../../hooks/use-save-toast";
import { useT } from "../../i18n-context";
import { GearIcon, InfoCircleIcon, DownloadIcon } from "../../../shared/icons";
import { SaveToast } from "../ui/SaveToast";
import { useDevOverrideValue } from "../../hooks/use-dev-override";
import styles from "./Titlebar.module.scss";

// Lazy-load the dev override badge so the store is excluded from production bundles.
const LazyDevOverrideBadge = import.meta.env.DEV
  ? lazy(() => import("../dev/DevOverrideBadge").then((m) => ({ default: m.DevOverrideBadge })))
  : null;

export function Titlebar() {
  const t = useT();
  const activeTab = useConfigStore((s) => s.activeTab);
  const setActiveTab = useConfigStore((s) => s.setActiveTab);
  const showToast = useSaveToast((s) => s.show);
  const toastTimestamp = useSaveToast((s) => s.timestamp);
  const hideToast = useSaveToast((s) => s.hide);
  const [updateState, setUpdateState] = useState<UpdateState | null>(null);

  useEffect(() => {
    window.voxApi.updates.getState().then(setUpdateState);
    const unsub = window.voxApi.updates.onStateChanged(setUpdateState);
    return unsub;
  }, []);

  useEffect(() => {
    const handleBlur = () => {
      if (showToast) hideToast();
    };
    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  }, [showToast, hideToast]);

  const isDevMode = import.meta.env.DEV;

  const devUpdateStatus = import.meta.env.DEV
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useDevOverrideValue("updateStatus", undefined)
    : undefined;

  const devDownloadProgress = import.meta.env.DEV
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useDevOverrideValue("updateDownloadProgress", undefined)
    : undefined;

  const status = devUpdateStatus ?? updateState?.status ?? "idle";

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
          {`${Math.round(devDownloadProgress ?? updateState?.downloadProgress ?? 0)}%`}
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
            <DownloadIcon width={14} height={14} />
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
      <div className={styles.spacer} />
      <SaveToast show={showToast} timestamp={toastTimestamp} onHide={hideToast} />
      {LazyDevOverrideBadge && (
        <Suspense fallback={null}>
          <LazyDevOverrideBadge />
        </Suspense>
      )}
      {renderUpdateButton()}
      <button
        className={`${styles.actionBtn} ${activeTab === "about" ? styles.actionBtnActive : ""}`}
        onClick={() => setActiveTab("about")}
        title={t("general.about.title")}
      >
        <InfoCircleIcon width={18} height={18} />
      </button>
      <button
        className={`${styles.actionBtn} ${activeTab === "general" ? styles.actionBtnActive : ""}`}
        onClick={() => setActiveTab("general")}
        title={t("tabs.general")}
      >
        <GearIcon width={18} height={18} />
      </button>
    </div>
  );
}
