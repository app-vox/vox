import { useEffect, useState } from "react";
import { useT } from "../../../i18n-context";
import { useOnboardingStore } from "../use-onboarding-store";
import { useConfigStore } from "../../../stores/config-store";
import { usePermissions } from "../../../hooks/use-permissions";
import { PermissionRow } from "../../permissions/PermissionRow";
import { MicIcon, LockIcon } from "../../../../shared/icons";
import styles from "../OnboardingOverlay.module.scss";
import btn from "../../shared/buttons.module.scss";

export function PermissionsStep() {
  const t = useT();
  const next = useOnboardingStore((s) => s.next);
  const config = useConfigStore((s) => s.config);
  const { status, refresh, requestMicrophone, requestAccessibility } = usePermissions();
  const [requestingMic, setRequestingMic] = useState(false);

  const holdShortcut = config?.shortcuts.hold || "Alt+Space";

  useEffect(() => {
    refresh();
    const handleFocus = () => refresh();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refresh]);

  const handleMicRequest = async () => {
    setRequestingMic(true);
    await requestMicrophone();
    setRequestingMic(false);
  };

  const micGranted = status?.microphone === "granted";
  const accGranted = !!status?.accessibility;

  return (
    <div className={styles.stepContent}>
      <h2 className={styles.stepTitle}>
        {t("onboarding.permissions.stepLabel", { current: "2", total: "8" })}
        {" — "}
        {t("onboarding.permissions.title")}
      </h2>
      <p className={styles.description}>{t("onboarding.permissions.description")}</p>

      <div className={styles.permissionList}>
        <PermissionRow
          variant="onboarding"
          icon={<MicIcon width={20} height={20} />}
          name={t("onboarding.permissions.microphoneLabel")}
          description={t("onboarding.permissions.microphoneDesc")}
          granted={micGranted}
          buttonText={t("onboarding.permissions.grantAccess")}
          onRequest={handleMicRequest}
          requesting={requestingMic}
        />
        <PermissionRow
          variant="onboarding"
          icon={<LockIcon width={20} height={20} />}
          name={t("onboarding.permissions.accessibilityLabel")}
          description={t("onboarding.permissions.accessibilityDesc", { shortcut: holdShortcut })}
          granted={accGranted}
          buttonText={t("onboarding.permissions.openSettings")}
          onRequest={requestAccessibility}
        />
      </div>

      <p className={styles.hint}>{t("onboarding.permissions.trayNote")}</p>

      <button
        className={`${btn.btn} ${btn.primary} ${styles.ctaButton}`}
        onClick={next}
        disabled={!micGranted || !accGranted}
      >
        {t("onboarding.navigation.continue")}
      </button>
    </div>
  );
}
