import { useDevOverrides } from "../../stores/dev-overrides-store";
import { useConfigStore } from "../../stores/config-store";
import styles from "../layout/Titlebar.module.scss";

export function DevOverrideBadge() {
  const enabled = useDevOverrides((s) => s.overrides.enabled);
  const setActiveTab = useConfigStore((s) => s.setActiveTab);

  if (!enabled) return null;

  return (
    <button
      className={styles.overrideBadge}
      onClick={() => setActiveTab("dev")}
    >
      {"States Overridden"}
    </button>
  );
}
