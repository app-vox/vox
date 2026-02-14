import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { UpdateState } from "../../../preload/index";
import { useConfigStore } from "../../stores/config-store";
import { usePermissions } from "../../hooks/use-permissions";
import { useT } from "../../i18n-context";
import {
  GearIcon,
  MicIcon,
  LayersIcon,
  BookIcon,
  ClockIcon,
  ShieldIcon,
  KeyboardIcon,
  InfoCircleIcon,
  MenuIcon,
  CheckmarkBadgeIcon,
  AlertLinesIcon,
} from "../../../shared/icons";
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

const CATEGORY_DEFS: NavCategoryDef[] = [
  {
    items: [
      { id: "general", icon: <GearIcon width={16} height={16} /> },
    ],
  },
  {
    labelKey: "sidebar.ai",
    items: [
      { id: "whisper", icon: <MicIcon width={16} height={16} />, requiresModel: true, checkConfigured: "speech" },
      { id: "llm", icon: <LayersIcon width={16} height={16} />, checkConfigured: "ai-enhancement" },
    ],
  },
  {
    labelKey: "sidebar.words",
    items: [
      { id: "dictionary", icon: <BookIcon width={16} height={16} /> },
      { id: "history", icon: <ClockIcon width={16} height={16} /> },
    ],
  },
  {
    labelKey: "sidebar.interface",
    items: [
      { id: "permissions", icon: <ShieldIcon width={16} height={16} />, requiresPermissions: true, checkConfigured: "permissions" },
      { id: "shortcuts", icon: <KeyboardIcon width={16} height={16} /> },
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
  const [updateState, setUpdateState] = useState<UpdateState | null>(null);
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
    history: t("tabs.history"),
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

  useEffect(() => {
    window.voxApi.updates.getState().then(setUpdateState);
    return window.voxApi.updates.onStateChanged(setUpdateState);
  }, []);

  const hasUpdate = updateState?.status === "available" || updateState?.status === "downloading" || updateState?.status === "ready";

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
          <CheckmarkBadgeIcon className={styles.checkmark} width={10} height={10} />
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
          <MenuIcon width={16} height={16} />
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
        <div className={styles.divider} />
        <button
          className={`${styles.navItem} ${activeTab === "about" ? styles.navItemActive : ""}`}
          onClick={() => setActiveTab("about")}
          title={collapsed ? (hasUpdate ? t("sidebar.updateAvailable") : t("general.about.title")) : undefined}
        >
          <div className={styles.iconWrap}>
            <InfoCircleIcon width={16} height={16} />
            {hasUpdate && collapsed && (
              <span className={styles.updateBadge}>
                <AlertLinesIcon />
              </span>
            )}
          </div>
          {!collapsed && (
            <span className={styles.label}>
              {t("general.about.title")}
              {hasUpdate && <span className={styles.updateLabel}>{t("sidebar.updateVox")}</span>}
            </span>
          )}
        </button>
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
