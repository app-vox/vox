import { useState, useEffect } from "react";
import { useConfigStore } from "../../stores/config-store";
import { usePermissions } from "../../hooks/use-permissions";
import { useT } from "../../i18n-context";
import { PermissionRow } from "./PermissionRow";
import { PipelineTest } from "./PipelineTest";
import { MicIcon, LockIcon, ShieldIcon } from "../../../shared/icons";
import card from "../shared/card.module.scss";

export function PermissionsPanel() {
  const t = useT();
  const activeTab = useConfigStore((s) => s.activeTab);
  const setupComplete = useConfigStore((s) => s.setupComplete);
  const { status, keychainStatus, refresh, requestMicrophone, requestAccessibility } = usePermissions();
  const [requestingMic, setRequestingMic] = useState(false);

  useEffect(() => {
    if (activeTab === "permissions") refresh();
  }, [activeTab, refresh]);

  useEffect(() => {
    const handleFocus = () => {
      if (activeTab === "permissions") refresh();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [activeTab, refresh]);

  const handleMicRequest = async () => {
    setRequestingMic(true);
    await requestMicrophone();
    setRequestingMic(false);
  };

  const handleOpenKeychain = () => {
    window.voxApi.shell.openExternal("x-apple.systempreferences:com.apple.preference.security?Privacy");
  };

  const micGranted = status?.microphone === "granted";
  const accGranted = !!status?.accessibility;

  const keychainGranted = keychainStatus?.available ?? false;
  const keychainDescription = !keychainStatus
    ? t("permissions.keychainDesc")
    : keychainStatus.available
      ? keychainStatus.encryptedCount > 0
        ? t("permissions.keychainProtectedDesc", { count: String(keychainStatus.encryptedCount) })
        : t("permissions.keychainAvailableDesc")
      : t("permissions.keychainUnprotectedDesc");
  const keychainStatusText = !keychainStatus
    ? undefined
    : keychainStatus.available
      ? keychainStatus.encryptedCount > 0
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
          <PermissionRow
            icon={<MicIcon width={18} height={18} />}
            name={t("permissions.microphone")}
            description={t("permissions.microphoneDesc")}
            granted={micGranted}
            statusText={status?.microphone === "denied" ? t("permissions.denied") : undefined}
            buttonText={t("permissions.grantAccess")}
            onRequest={handleMicRequest}
            requesting={requestingMic}
            setupRequired={!setupComplete}
          />
          <PermissionRow
            icon={<LockIcon width={18} height={18} />}
            name={t("permissions.accessibility")}
            description={t("permissions.accessibilityDesc")}
            granted={accGranted}
            buttonText={t("permissions.openSettings")}
            onRequest={requestAccessibility}
            setupRequired={!setupComplete}
          />
          <PermissionRow
            icon={<ShieldIcon width={18} height={18} />}
            name={t("permissions.keychain")}
            description={keychainDescription}
            granted={keychainGranted}
            statusText={keychainStatusText}
            buttonText={keychainStatus?.available === false ? t("permissions.keychainOpenKeychain") : undefined}
            onRequest={keychainStatus?.available === false ? handleOpenKeychain : undefined}
          />
        </div>
      </div>

      <div className={card.card}>
        <PipelineTest />
      </div>
    </>
  );
}
