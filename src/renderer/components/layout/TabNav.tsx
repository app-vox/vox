import { useConfigStore } from "../../stores/config-store";
import styles from "./TabNav.module.scss";

const TABS = [
  { id: "whisper", label: "Local Model" },
  { id: "llm", label: "AI Improvement" },
  { id: "shortcuts", label: "Shortcuts" },
  { id: "permissions", label: "Permissions" },
  { id: "appearance", label: "Appearance" },
];

export function TabNav() {
  const activeTab = useConfigStore((s) => s.activeTab);
  const setActiveTab = useConfigStore((s) => s.setActiveTab);

  return (
    <nav className={styles.tabs}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`${styles.tab} ${activeTab === tab.id ? styles.active : ""}`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
