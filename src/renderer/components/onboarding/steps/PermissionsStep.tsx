import { useT } from "../../../i18n-context";
import { useOnboardingStore } from "../use-onboarding-store";
import { usePermissionRequest } from "../../../hooks/use-permission-request";
import { useDevOverrideValue } from "../../../hooks/use-dev-override";
import { useConfigStore } from "../../../stores/config-store";
import { PermissionRequest } from "../../ui/PermissionRequest";
import { MicIcon, LockIcon } from "../../../../shared/icons";
import styles from "../OnboardingOverlay.module.scss";
import btn from "../../shared/buttons.module.scss";

export function PermissionsStep() {
  const t = useT();
  const next = useOnboardingStore((s) => s.next);
  const config = useConfigStore((s) => s.config);
  const perm = usePermissionRequest();

  const devMicOverride = import.meta.env.DEV
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useDevOverrideValue("microphonePermission", undefined)
    : undefined;

  const devAccOverride = import.meta.env.DEV
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useDevOverrideValue("accessibilityPermission", undefined)
    : undefined;

  const micGranted = devMicOverride !== undefined
    ? devMicOverride === "granted"
    : perm.microphone.granted;
  const accGranted = devAccOverride !== undefined
    ? !!devAccOverride
    : perm.accessibility.granted;

  const holdShortcut = config?.shortcuts.hold || "Alt+Space";

  return (
    <div className={styles.stepContent}>
      <h2 className={styles.stepTitle}>
        {t("onboarding.permissions.stepLabel", { current: "2", total: "8" })}
        {" — "}
        {t("onboarding.permissions.title")}
      </h2>
      <p className={styles.description}>{t("onboarding.permissions.description")}</p>

      <div className={styles.permissionList}>
        <PermissionRequest
          icon={<MicIcon width={20} height={20} />}
          name={t("onboarding.permissions.microphoneLabel")}
          description={t("onboarding.permissions.microphoneDesc")}
          granted={micGranted}
          buttonText={t("onboarding.permissions.grantAccess")}
          onRequest={perm.microphone.request}
          requesting={perm.microphone.requesting}
        />
        <PermissionRequest
          icon={<LockIcon width={20} height={20} />}
          name={t("onboarding.permissions.accessibilityLabel")}
          description={t("onboarding.permissions.accessibilityDesc", { shortcut: holdShortcut })}
          granted={accGranted}
          buttonText={t("onboarding.permissions.openSettings")}
          onRequest={perm.accessibility.request}
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
