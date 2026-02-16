import { useEffect, useCallback, useState } from "react";
import { useT } from "../../../i18n-context";
import { useOnboardingStore } from "../use-onboarding-store";
import { useConfigStore } from "../../../stores/config-store";
import { MicIcon, LockIcon } from "../../../../shared/icons";
import styles from "../OnboardingOverlay.module.scss";
import btn from "../../shared/buttons.module.scss";

export function PermissionsStep() {
  const t = useT();
  const next = useOnboardingStore((s) => s.next);
  const microphoneGranted = useOnboardingStore((s) => s.microphoneGranted);
  const accessibilityGranted = useOnboardingStore((s) => s.accessibilityGranted);
  const setMicrophoneGranted = useOnboardingStore((s) => s.setMicrophoneGranted);
  const setAccessibilityGranted = useOnboardingStore((s) => s.setAccessibilityGranted);
  const config = useConfigStore((s) => s.config);
  const [requestingMic, setRequestingMic] = useState(false);

  const holdShortcut = config?.shortcuts.hold || "Alt+Space";

  const refreshPermissions = useCallback(async () => {
    const status = await window.voxApi.permissions.status();
    setMicrophoneGranted(status.microphone === "granted");
    setAccessibilityGranted(status.accessibility === true);
  }, [setMicrophoneGranted, setAccessibilityGranted]);

  useEffect(() => {
    refreshPermissions();
    const handleFocus = () => refreshPermissions();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refreshPermissions]);

  const handleMicRequest = async () => {
    setRequestingMic(true);
    await window.voxApi.permissions.requestMicrophone();
    await refreshPermissions();
    setRequestingMic(false);
  };

  const handleAccessibilityRequest = async () => {
    await window.voxApi.permissions.requestAccessibility();
  };

  return (
    <div className={styles.stepContent}>
      <h2 className={styles.stepTitle}>
        {t("onboarding.permissions.stepLabel", { current: "2", total: "4" })}
        {" — "}
        {t("onboarding.permissions.title")}
      </h2>
      <p className={styles.description}>{t("onboarding.permissions.description")}</p>

      <div className={styles.permissionList}>
        <div className={styles.permissionRow}>
          <div className={styles.permissionIcon}><MicIcon width={20} height={20} /></div>
          <div className={styles.permissionInfo}>
            <span className={styles.permissionName}>{t("onboarding.permissions.microphoneLabel")}</span>
            <span className={styles.permissionDesc}>{t("onboarding.permissions.microphoneDesc")}</span>
          </div>
          {microphoneGranted ? (
            <span className={styles.grantedBadge}>{t("onboarding.permissions.granted")}</span>
          ) : (
            <button
              className={`${btn.btn} ${btn.primary} ${btn.sm}`}
              onClick={handleMicRequest}
              disabled={requestingMic}
            >
              {t("onboarding.permissions.grantAccess")}
            </button>
          )}
        </div>

        <div className={styles.permissionRow}>
          <div className={styles.permissionIcon}><LockIcon width={20} height={20} /></div>
          <div className={styles.permissionInfo}>
            <span className={styles.permissionName}>{t("onboarding.permissions.accessibilityLabel")}</span>
            <span className={styles.permissionDesc}>
              {t("onboarding.permissions.accessibilityDesc", { shortcut: holdShortcut })}
            </span>
            <span className={styles.permissionOptional}>{t("onboarding.permissions.accessibilityOptional")}</span>
          </div>
          {accessibilityGranted ? (
            <span className={styles.grantedBadge}>{t("onboarding.permissions.granted")}</span>
          ) : (
            <button
              className={`${btn.btn} ${btn.secondary} ${btn.sm}`}
              onClick={handleAccessibilityRequest}
            >
              {t("onboarding.permissions.openSettings")}
            </button>
          )}
        </div>
      </div>

      <p className={styles.hint}>{t("onboarding.permissions.trayNote")}</p>

      <button
        className={`${btn.btn} ${btn.primary} ${styles.ctaButton}`}
        onClick={next}
        disabled={!microphoneGranted}
      >
        {t("onboarding.navigation.continue")}
      </button>
    </div>
  );
}
