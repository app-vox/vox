import { useState, useEffect } from "react";
import { useConfigStore } from "../../stores/config-store";
import { usePermissions } from "../../hooks/use-permissions";
import { PermissionRow } from "./PermissionRow";
import { PipelineTest } from "./PipelineTest";
import { MicIcon, LockIcon } from "../ui/icons";
import card from "../shared/card.module.scss";

export function PermissionsPanel() {
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
          <h2>System Permissions</h2>
          <p className={card.description}>Vox requires these macOS permissions to function properly.</p>
        </div>
        <div className={card.body}>
          <PermissionRow
            icon={<MicIcon />}
            name="Microphone"
            description="Required for voice recording"
            granted={micGranted}
            statusText={status?.microphone === "denied" ? "Denied" : undefined}
            buttonText="Grant Access"
            onRequest={handleMicRequest}
            requesting={requestingMic}
            setupRequired={!setupComplete}
          />
          <PermissionRow
            icon={<LockIcon />}
            name="Accessibility"
            description="Required for auto-paste (Cmd+V simulation)"
            granted={accGranted}
            buttonText="Open Settings"
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
