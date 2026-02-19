import { useConfigStore } from "../../stores/config-store";
import { usePermissionRequest } from "../../hooks/use-permission-request";
import { useTranscriptionTest } from "../../hooks/use-transcription-test";
import { useDevOverrideValue } from "../../hooks/use-dev-override";
import { useT } from "../../i18n-context";
import { PermissionRequest } from "../ui/PermissionRequest";
import { TranscriptionTest } from "../ui/TranscriptionTest";
import { MicIcon, LockIcon, ShieldIcon } from "../../../shared/icons";
import card from "../shared/card.module.scss";

export function PermissionsPanel() {
  const t = useT();
  const realSetupComplete = useConfigStore((s) => s.setupComplete);
  const perm = usePermissionRequest();
  const transcriptionTest = useTranscriptionTest(5);

  const setupComplete = import.meta.env.DEV
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useDevOverrideValue("setupComplete", realSetupComplete)
    : realSetupComplete;

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

  const keychainDescription = !perm.keychain.status
    ? t("permissions.keychainDesc")
    : perm.keychain.status.available
      ? perm.keychain.status.encryptedCount > 0
        ? t("permissions.keychainProtectedDesc", { count: String(perm.keychain.status.encryptedCount) })
        : t("permissions.keychainAvailableDesc")
      : t("permissions.keychainUnprotectedDesc");

  const keychainStatusText = !perm.keychain.status
    ? undefined
    : perm.keychain.status.available
      ? perm.keychain.status.encryptedCount > 0
        ? t("permissions.keychainProtected")
        : t("permissions.keychainAvailable")
      : t("permissions.keychainUnprotected");

  return (
    <>
      <div className={card.card}>
        <div className={card.header}>
          <h2>{t("permissions.title")}</h2>
          <p className={card.description}>{t("permissions.description")}</p>
        </div>
        <div className={card.body}>
          <PermissionRequest
            icon={<MicIcon width={18} height={18} />}
            name={t("permissions.microphone")}
            description={t("permissions.microphoneDesc")}
            granted={micGranted}
            statusText={!micGranted && !setupComplete ? t("permissions.setupRequired") : undefined}
            buttonText={t("permissions.grantAccess")}
            onRequest={perm.microphone.request}
            requesting={perm.microphone.requesting}
          />
          <PermissionRequest
            icon={<LockIcon width={18} height={18} />}
            name={t("permissions.accessibility")}
            description={t("permissions.accessibilityDesc")}
            granted={accGranted}
            statusText={!accGranted && !setupComplete ? t("permissions.setupRequired") : undefined}
            buttonText={t("permissions.openSettings")}
            onRequest={perm.accessibility.request}
          />
          <PermissionRequest
            icon={<ShieldIcon width={18} height={18} />}
            name={t("permissions.keychain")}
            description={keychainDescription}
            granted={perm.keychain.granted}
            statusText={keychainStatusText}
            buttonText={perm.keychain.status?.available === false ? t("permissions.keychainOpenKeychain") : undefined}
            onRequest={perm.keychain.status?.available === false ? perm.keychain.openSettings : undefined}
          />
        </div>
      </div>

      <div className={card.card}>
        <div className={card.header}>
          <h2>{t("permissions.pipeline.title")}</h2>
          <p className={card.description}>{t("permissions.pipeline.description")}</p>
        </div>
        <div className={card.body}>
          <TranscriptionTest
            testing={transcriptionTest.testing}
            result={transcriptionTest.result}
            error={transcriptionTest.error}
            onTest={transcriptionTest.run}
            buttonText={t("permissions.pipeline.testButton")}
            showLlmResult={true}
          />
        </div>
      </div>
    </>
  );
}
