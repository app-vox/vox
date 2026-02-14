import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useConfigStore } from "../../stores/config-store";
import { usePermissions } from "../../hooks/use-permissions";
import { useT } from "../../i18n-context";
import { WarningBadge } from "../ui/WarningBadge";
import styles from "./Sidebar.module.scss";

const VOX_WEBSITE_URL = "https://app-vox.github.io/vox/";

interface NavItemDef {
  id: string;
  icon: ReactNode;
  requiresModel?: boolean;
  requiresPermissions?: boolean;
  checkConfigured?: "speech" | "permissions" | "ai-enhancement";
}

interface NavItem extends NavItemDef {
  label: string;
}

interface NavCategoryDef {
  labelKey?: string;
  items: NavItemDef[];
}

interface NavCategory {
  label?: string;
  items: NavItem[];
}

const GEAR_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const MIC_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const LAYERS_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

const BOOK_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const CLOCK_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const SHIELD_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const KEYBOARD_ICON = (
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
);

const COLLAPSE_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const CATEGORY_DEFS: NavCategoryDef[] = [
  {
    labelKey: "sidebar.words",
    items: [
      { id: "transcriptions", icon: CLOCK_ICON },
      { id: "dictionary", icon: BOOK_ICON },
    ],
  },
  {
    labelKey: "sidebar.ai",
    items: [
      { id: "whisper", icon: MIC_ICON, requiresModel: true, checkConfigured: "speech" },
      { id: "llm", icon: LAYERS_ICON, checkConfigured: "ai-enhancement" },
    ],
  },
  {
    labelKey: "sidebar.interface",
    items: [
      { id: "shortcuts", icon: KEYBOARD_ICON },
      { id: "permissions", icon: SHIELD_ICON, requiresPermissions: true, checkConfigured: "permissions" },
    ],
  },
  {
    items: [
      { id: "general", icon: GEAR_ICON },
    ],
  },
];

interface SidebarProps {
  onCollapseChange?: (collapsed: boolean) => void;
}

const SIDEBAR_COLLAPSED_KEY = "vox:sidebar-collapsed";

export function Sidebar({ onCollapseChange }: SidebarProps) {
  const t = useT();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true");
  const [logoSrc, setLogoSrc] = useState("");
  const activeTab = useConfigStore((s) => s.activeTab);
  const setActiveTab = useConfigStore((s) => s.setActiveTab);
  const setupComplete = useConfigStore((s) => s.setupComplete);
  const config = useConfigStore((s) => s.config);
  const { status: permissionStatus } = usePermissions();

  const itemLabels: Record<string, string> = {
    general: t("tabs.general"),
    whisper: t("tabs.speech"),
    llm: t("tabs.aiEnhancement"),
    dictionary: t("tabs.dictionary"),
    transcriptions: t("tabs.transcriptions"),
    permissions: t("tabs.permissions"),
    shortcuts: t("tabs.shortcuts"),
  };

  const categories: NavCategory[] = CATEGORY_DEFS.map((cat) => ({
    label: cat.labelKey ? t(cat.labelKey) : undefined,
    items: cat.items.map((item) => ({ ...item, label: itemLabels[item.id] ?? item.id })),
  }));

  useEffect(() => {
    onCollapseChange?.(collapsed);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.voxApi.resources.dataUrl("trayIcon@8x.png").then(setLogoSrc);
  }, []);

  const isConfigured = (type?: "speech" | "permissions" | "ai-enhancement") => {
    if (!type) return false;
    if (type === "speech") return setupComplete;
    if (type === "permissions") return permissionStatus?.accessibility === true && permissionStatus?.microphone === "granted";
    if (type === "ai-enhancement") return setupComplete && config?.enableLlmEnhancement === true;
    return false;
  };

  const needsPermissions = () => {
    return permissionStatus?.accessibility !== true || permissionStatus?.microphone !== "granted";
  };

  const renderItem = (item: NavItem) => (
    <button
      key={item.id}
      className={`${styles.navItem} ${activeTab === item.id ? styles.navItemActive : ""}`}
      onClick={() => setActiveTab(item.id)}
      title={collapsed ? item.label : undefined}
    >
      <div className={styles.iconWrap}>
        {item.icon}
        {isConfigured(item.checkConfigured) && (
          <svg
            className={styles.checkmark}
            width="10"
            height="10"
            viewBox="0 0 16 16"
            fill="none"
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
      {!collapsed && (
        <span className={styles.label}>
          {item.label}
          <WarningBadge show={(item.requiresModel === true && !setupComplete) || (item.requiresPermissions === true && needsPermissions())} />
        </span>
      )}
    </button>
  );

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
      <div className={styles.top}>
        {!collapsed && logoSrc && (
          <img
            alt="Vox"
            src={logoSrc}
            className={styles.logoClickable}
            draggable={false}
            onClick={() => window.voxApi.shell.openExternal(VOX_WEBSITE_URL)}
            title={t("sidebar.visitWebsite")}
          />
        )}
        {!collapsed && <span className={styles.title}>Vox</span>}
        <button
          className={styles.collapseBtn}
          onClick={() => {
            setCollapsed((v) => {
              const next = !v;
              localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
              onCollapseChange?.(next);
              return next;
            });
          }}
          title={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
        >
          {COLLAPSE_ICON}
        </button>
      </div>

      <nav className={styles.nav}>
        {categories.map((cat, i) => (
          <div key={cat.label ?? i} className={styles.category}>
            {cat.label && !collapsed && (
              <div className={styles.categoryLabel}>{cat.label}</div>
            )}
            {cat.items.map(renderItem)}
          </div>
        ))}
      </nav>

      <div className={styles.bottom}>
        {collapsed && logoSrc && (
          <div className={styles.collapsedLogo}>
            <img
              alt="Vox"
              src={logoSrc}
              className={styles.logoClickable}
              draggable={false}
              onClick={() => window.voxApi.shell.openExternal(VOX_WEBSITE_URL)}
              title={t("sidebar.visitWebsite")}
            />
          </div>
        )}
      </div>
    </aside>
  );
}
