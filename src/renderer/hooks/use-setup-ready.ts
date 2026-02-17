import { useConfigStore } from "../stores/config-store";
import { usePermissionsStore } from "../stores/permissions-store";

/**
 * Returns true when all must-have setup items are satisfied:
 * a whisper model is downloaded, microphone is granted, and accessibility is enabled.
 */
export function useSetupReady(): boolean {
  const setupComplete = useConfigStore((s) => s.setupComplete);
  const permStatus = usePermissionsStore((s) => s.status);

  return (
    setupComplete &&
    permStatus?.microphone === "granted" &&
    permStatus?.accessibility === true
  );
}
