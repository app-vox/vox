import { useDevOverrides } from "../../stores/dev-overrides-store";
import { useConfigStore } from "../../stores/config-store";
import styles from "../layout/Titlebar.module.scss";

export function DevOverrideBadge() {
  const enabled = useDevOverrides((s) => s.overrides.enabled);
  const hideDevVisuals = useDevOverrides((s) => s.overrides.hideDevVisuals);
  const setActiveTab = useConfigStore((s) => s.setActiveTab);

  if (!enabled) return null;

  return (
    <button
      className={`${styles.overrideBadge} ${hideDevVisuals === true ? styles.devHidden : ""}`}
      onClick={() => setActiveTab("dev")}
    >
      {"Overrides Active"}
    </button>
  );
}
