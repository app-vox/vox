import { XIcon } from "../../../shared/icons";
import { useDevOverrides } from "../../stores/dev-overrides-store";
import { useConfigStore } from "../../stores/config-store";
import { Tabs } from "../../../shared/tabs";
import styles from "../layout/Titlebar.module.scss";

export function DevOverrideBadge() {
  const enabled = useDevOverrides((s) => s.overrides.enabled);
  const hideDevVisuals = useDevOverrides((s) => s.overrides.hideDevVisuals);
  const clearAll = useDevOverrides((s) => s.clearAll);
  const setActiveTab = useConfigStore((s) => s.setActiveTab);

  if (!enabled) return null;

  return (
    <div className={`${styles.overrideBadgeGroup} ${hideDevVisuals === true ? styles.devHidden : ""}`}>
      <button
        className={styles.overrideClear}
        onClick={(e) => {
          e.stopPropagation();
          clearAll();
        }}
        aria-label="Clear all overrides"
      >
        <XIcon width={10} height={10} />
      </button>
      <button
        className={styles.overrideBadge}
        onClick={() => setActiveTab(Tabs.DEV)}
      >
        {"Overrides Active"}
      </button>
    </div>
  );
}
