import type { ReactNode } from "react";
import { useConfigStore } from "../../stores/config-store";
import { useT } from "../../i18n-context";
import { WarningBadge } from "../ui/WarningBadge";
import { usePermissions } from "../../hooks/use-permissions";
import styles from "./TabNav.module.scss";

const TABS: { id: string; icon: ReactNode; requiresModel?: boolean; requiresPermissions?: boolean; checkConfigured?: "speech" | "permissions" | "ai-enhancement" }[] = [
  {
    id: "history",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    id: "whisper",
    requiresModel: true,
    checkConfigured: "speech",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    ),
  },
  {
    id: "llm",
    checkConfigured: "ai-enhancement",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    id: "dictionary",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    id: "general",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    id: "permissions",
    requiresPermissions: true,
    checkConfigured: "permissions",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    id: "shortcuts",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M6 8h.01" />
        <path d="M10 8h.01" />
        <path d="M14 8h.01" />
        <path d="M18 8h.01" />
        <path d="M8 12h.01" />
        <path d="M12 12h.01" />
        <path d="M16 12h.01" />
        <path d="M7 16h10" />
      </svg>
    ),
  },
];

export function TabNav() {
  const t = useT();
  const activeTab = useConfigStore((s) => s.activeTab);
  const setActiveTab = useConfigStore((s) => s.setActiveTab);
  const setupComplete = useConfigStore((s) => s.setupComplete);
  const config = useConfigStore((s) => s.config);
  const { status: permissionStatus } = usePermissions();

  const tabLabels: Record<string, string> = {
    history: t("tabs.history"),
    whisper: t("tabs.speech"),
    llm: t("tabs.aiEnhancement"),
    dictionary: t("tabs.dictionary"),
    general: t("tabs.general"),
    permissions: t("tabs.permissions"),
    shortcuts: t("tabs.shortcuts"),
  };

  const isConfigured = (type?: "speech" | "permissions" | "ai-enhancement") => {
    if (!type) return false;
    if (type === "speech") return setupComplete;
    if (type === "permissions") return permissionStatus?.accessibility === true && permissionStatus?.microphone === "granted";
    if (type === "ai-enhancement") return config?.enableLlmEnhancement === true;
    return false;
  };

  const needsPermissions = () => {
    return permissionStatus?.accessibility !== true || permissionStatus?.microphone !== "granted";
  };

  return (
    <nav className={styles.tabs}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`${styles.tab} ${activeTab === tab.id ? styles.active : ""}`}
        >
          <div style={{ position: 'relative' }}>
            {tab.icon}
            {isConfigured(tab.checkConfigured) && (
              <svg
                className={styles.checkmark}
                width="10"
                height="10"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="8" cy="8" r="8" fill="var(--color-text-primary)" />
                <path
                  d="M11 5L7 10L5 8"
                  stroke="var(--color-bg-root)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
          <span>
            {tabLabels[tab.id]}
            <WarningBadge show={(tab.requiresModel === true && !setupComplete) || (tab.requiresPermissions === true && needsPermissions())} />
          </span>
        </button>
      ))}
    </nav>
  );
}
