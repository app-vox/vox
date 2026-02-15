import { useState, useEffect } from "react";
import type { DevOverrides } from "../stores/dev-overrides-store";

const STORAGE_KEY = "vox:dev-overrides";

function readOverrides(): DevOverrides | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DevOverrides;
      if (parsed.enabled) return parsed;
    }
  } catch { /* ignore */ }
  return null;
}

/**
 * Production-safe hook that reads dev overrides from localStorage.
 * Only imports the type (zero runtime dependency on the dev store).
 * Returns the override value if overrides are enabled and the key is set,
 * otherwise returns the provided real value.
 *
 * Gated behind import.meta.env.DEV at call sites so it's tree-shaken in prod.
 */
export function useDevOverrideValue<K extends keyof DevOverrides>(
  key: K,
  realValue: DevOverrides[K],
): DevOverrides[K] {
  const [overrideValue, setOverrideValue] = useState<DevOverrides[K]>(() => {
    const ov = readOverrides();
    return ov && ov[key] !== undefined ? ov[key]! : realValue;
  });

  useEffect(() => {
    const handler = () => {
      const ov = readOverrides();
      if (ov && ov[key] !== undefined) {
        setOverrideValue(ov[key]!);
      } else {
        setOverrideValue(realValue);
      }
    };
    window.addEventListener("vox:dev-overrides-changed", handler);
    return () => window.removeEventListener("vox:dev-overrides-changed", handler);
  }, [key, realValue]);

  return overrideValue;
}

/**
 * Returns true when dev overrides are enabled and at least one key is actively set.
 * Used to show a visual indicator (e.g. red dot on sidebar).
 */
export function useDevOverridesActive(): boolean {
  const [active, setActive] = useState(() => {
    const ov = readOverrides();
    if (!ov) return false;
    return Object.keys(ov).some((k) => k !== "enabled" && k !== "hideDevVisuals" && ov[k as keyof DevOverrides] !== undefined);
  });

  useEffect(() => {
    const handler = () => {
      const ov = readOverrides();
      if (!ov) { setActive(false); return; }
      setActive(Object.keys(ov).some((k) => k !== "enabled" && ov[k as keyof DevOverrides] !== undefined));
    };
    window.addEventListener("vox:dev-overrides-changed", handler);
    return () => window.removeEventListener("vox:dev-overrides-changed", handler);
  }, []);

  return active;
}
