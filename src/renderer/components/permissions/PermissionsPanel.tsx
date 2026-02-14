import { useState, useEffect } from "react";
import { useConfigStore } from "../../stores/config-store";
import { usePermissions } from "../../hooks/use-permissions";
import { useT } from "../../i18n-context";
import { PermissionRow } from "./PermissionRow";
import { PipelineTest } from "./PipelineTest";
import { MicIcon, LockIcon } from "../../../shared/icons";
import card from "../shared/card.module.scss";

export function PermissionsPanel() {
  const t = useT();
  const activeTab = useConfigStore((s) => s.activeTab);
  const setupComplete = useConfigStore((s) => s.setupComplete);
  const { status, refresh, requestMicrophone, requestAccessibility } = usePermissions();
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

  const micGranted = status?.microphone === "granted";
  const accGranted = !!status?.accessibility;

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
        </div>
      </div>

      <div className={card.card}>
        <PipelineTest />
      </div>
    </>
  );
}
