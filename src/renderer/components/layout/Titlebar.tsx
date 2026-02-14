import { useConfigStore } from "../../stores/config-store";
import { useT } from "../../i18n-context";
import styles from "./Titlebar.module.scss";

const INFO_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

export function Titlebar() {
  const t = useT();
  const activeTab = useConfigStore((s) => s.activeTab);
  const setActiveTab = useConfigStore((s) => s.setActiveTab);

  return (
    <div className={styles.titlebar}>
      <button
        className={`${styles.actionBtn} ${activeTab === "about" ? styles.actionBtnActive : ""}`}
        onClick={() => setActiveTab("about")}
        title={t("general.about.title")}
      >
        {INFO_ICON}
      </button>
    </div>
  );
}
