import { useState, useCallback, useEffect } from "react";
import type { PermissionsStatus } from "../../preload/index";

export function usePermissions() {
  const [status, setStatus] = useState<PermissionsStatus | null>(null);

  const refresh = useCallback(async () => {
    const s = await window.voxApi.permissions.status();
    setStatus(s);
  }, []);

  useEffect(() => {
    window.voxApi.permissions.status().then(setStatus);
  }, []);

  const requestMicrophone = useCallback(async () => {
    await window.voxApi.permissions.requestMicrophone();
    await refresh();
  }, [refresh]);

  const requestAccessibility = useCallback(async () => {
    await window.voxApi.permissions.requestAccessibility();
  }, []);

  return { status, refresh, requestMicrophone, requestAccessibility };
}
