import { useState, useEffect, useCallback } from "react";
import { usePermissionsStore } from "../stores/permissions-store";

export function usePermissionRequest() {
  const status = usePermissionsStore((s) => s.status);
  const keychainStatus = usePermissionsStore((s) => s.keychainStatus);
  const refresh = usePermissionsStore((s) => s.refresh);
  const storeRequestMic = usePermissionsStore((s) => s.requestMicrophone);
  const storeRequestAcc = usePermissionsStore((s) => s.requestAccessibility);

  const [requestingMic, setRequestingMic] = useState(false);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handleFocus = () => refresh();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refresh]);

  const requestMicrophone = useCallback(async () => {
    setRequestingMic(true);
    try {
      await storeRequestMic();
    } finally {
      setRequestingMic(false);
    }
  }, [storeRequestMic]);

  const requestAccessibility = useCallback(async () => {
    await storeRequestAcc();
  }, [storeRequestAcc]);

  const openKeychainSettings = useCallback(() => {
    window.voxApi.shell.openExternal(
      "x-apple.systempreferences:com.apple.preference.security?Privacy"
    );
  }, []);

  return {
    microphone: {
      granted: status?.microphone === "granted",
      request: requestMicrophone,
      requesting: requestingMic,
    },
    accessibility: {
      granted: !!status?.accessibility,
      request: requestAccessibility,
    },
    keychain: {
      granted: keychainStatus?.available ?? false,
      status: keychainStatus,
      openSettings: openKeychainSettings,
    },
    refresh,
  };
}
