import { useEffect } from "react";
import { usePermissionsStore } from "../stores/permissions-store";

export function usePermissions() {
  const status = usePermissionsStore((s) => s.status);
  const keychainStatus = usePermissionsStore((s) => s.keychainStatus);
  const refresh = usePermissionsStore((s) => s.refresh);
  const requestMicrophone = usePermissionsStore((s) => s.requestMicrophone);
  const requestAccessibility = usePermissionsStore((s) => s.requestAccessibility);

  useEffect(() => {
    if (status === null) refresh();
  }, [status, refresh]);

  return { status, keychainStatus, refresh, requestMicrophone, requestAccessibility };
}
