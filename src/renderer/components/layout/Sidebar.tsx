import type { ReactNode } from "react";
import { useEffect, useState, useCallback } from "react";
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
import { NewDot } from "../ui/NewDot";
import { computeLlmConfigHash } from "../../../shared/llm-config-hash";
import { useDevOverrideValue, useDevOverridesActive } from "../../hooks/use-dev-override";
import styles from "./Sidebar.module.scss";

const VOX_WEBSITE_URL = "https://app-vox.github.io/vox/";

interface NavItemDef {
  id: string;
  icon: ReactNode;
  requiresModel?: boolean;
  requiresPermissions?: boolean;
  requiresTest?: boolean;
  requiresLlm?: boolean;
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
    labelKey: "sidebar.content",
    items: [
      { id: "transcriptions", icon: <ClockIcon width={16} height={16} /> },
      { id: "dictionary", icon: <BookIcon width={16} height={16} />, requiresLlm: true, checkConfigured: "ai-enhancement" },
    ],
  },
  {
    labelKey: "sidebar.ai",
    items: [
      { id: "whisper", icon: <MicIcon width={16} height={16} />, requiresModel: true, checkConfigured: "speech" },
      { id: "llm", icon: <LayersIcon width={16} height={16} />, requiresTest: true, checkConfigured: "ai-enhancement" },
    ],
  },
  {
    labelKey: "sidebar.interface",
    items: [
      { id: "shortcuts", icon: <KeyboardIcon width={16} height={16} /> },
      { id: "permissions", icon: <ShieldIcon width={16} height={16} />, requiresPermissions: true, checkConfigured: "permissions" },
    ],
  },
  {
    items: [
      { id: "general", icon: <GearIcon width={16} height={16} /> },
    ],
  },
];

const SIDEBAR_COLLAPSED_KEY = "vox:sidebar-collapsed";

const VISITED_DICTIONARY_KEY = "vox:visited-dictionary";

export function Sidebar() {
  const t = useT();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true");
  const [logoSrc, setLogoSrc] = useState("");
  const [iconSrc, setIconSrc] = useState("");
  const [updateState, setUpdateState] = useState<UpdateState | null>(null);
  const [visitedDictionary, setVisitedDictionary] = useState(() => localStorage.getItem(VISITED_DICTIONARY_KEY) === "true");
  const activeTab = useConfigStore((s) => s.activeTab);
  const setActiveTab = useConfigStore((s) => s.setActiveTab);
  const realSetupComplete = useConfigStore((s) => s.setupComplete);
  const config = useConfigStore((s) => s.config);
  const { status: realPermissionStatus } = usePermissions();

  // Dev overrides (gated — tree-shaken in production)
  const setupComplete = import.meta.env.DEV
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useDevOverrideValue("setupComplete", realSetupComplete)
    : realSetupComplete;

  const devMicOverride = import.meta.env.DEV
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useDevOverrideValue("microphonePermission", undefined)
    : undefined;

  const devAccessibilityOverride = import.meta.env.DEV
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useDevOverrideValue("accessibilityPermission", undefined)
    : undefined;

  const devUpdateStatus = import.meta.env.DEV
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useDevOverrideValue("updateStatus", undefined)
    : undefined;

  const devLlmEnhancement = import.meta.env.DEV
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useDevOverrideValue("llmEnhancementEnabled", undefined)
    : undefined;

  const devLlmTested = import.meta.env.DEV
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useDevOverrideValue("llmConnectionTested", undefined)
    : undefined;

  const devOverridesActive = import.meta.env.DEV
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useDevOverridesActive()
    : false;

  const hideDevVisuals = import.meta.env.DEV
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useDevOverrideValue("hideDevVisuals", undefined)
    : undefined;

  const devVisitedDictionary = import.meta.env.DEV
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useDevOverrideValue("visitedDictionary", undefined)
    : undefined;

  const permissionStatus = {
    ...realPermissionStatus,
    ...(devMicOverride !== undefined ? { microphone: devMicOverride } : {}),
    ...(devAccessibilityOverride !== undefined ? { accessibility: devAccessibilityOverride } : {}),
  };

  const handleTabClick = useCallback((id: string) => {
    if (id === "dictionary" && !visitedDictionary) {
      setVisitedDictionary(true);
      localStorage.setItem(VISITED_DICTIONARY_KEY, "true");
    }
    setActiveTab(id);
  }, [setActiveTab, visitedDictionary]);

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
    window.voxApi.resources.dataUrl("vox-logo.svg").then(setLogoSrc);
    window.voxApi.resources.dataUrl("trayIcon@8x.png").then(setIconSrc);
  }, []);

  useEffect(() => {
    window.voxApi.updates.getState().then(setUpdateState);
    return window.voxApi.updates.onStateChanged(setUpdateState);
  }, []);

  const effectiveUpdateStatus = devUpdateStatus ?? updateState?.status;
  const hasUpdate = effectiveUpdateStatus === "available" || effectiveUpdateStatus === "downloading" || effectiveUpdateStatus === "ready";

  const effectiveLlmEnhancement = devLlmEnhancement ?? config?.enableLlmEnhancement;
  const effectiveLlmTested = devLlmTested ?? config?.llmConnectionTested;

  const isConfigured = (type?: "speech" | "permissions" | "ai-enhancement") => {
    if (!type) return false;
    if (type === "speech") return setupComplete;
    if (type === "permissions") return permissionStatus?.accessibility === true && permissionStatus?.microphone === "granted";
    if (type === "ai-enhancement") {
      return setupComplete
        && effectiveLlmEnhancement === true
        && effectiveLlmTested === true
        && config != null && computeLlmConfigHash(config) === config.llmConfigHash;
    }
    return false;
  };

  const needsPermissions = () => {
    return permissionStatus?.accessibility !== true || permissionStatus?.microphone !== "granted";
  };

  const effectiveVisitedDictionary = devVisitedDictionary ?? visitedDictionary;
  const showDictionaryDot = !effectiveVisitedDictionary && setupComplete;

  const hasWarning = (item: NavItemDef) =>
    (item.requiresModel === true && !setupComplete)
    || (item.requiresPermissions === true && needsPermissions())
    || (item.requiresTest === true && effectiveLlmEnhancement === true && !isConfigured("ai-enhancement"));

  const renderItem = (item: NavItem) => (
    <button
      key={item.id}
      className={`${styles.navItem} ${activeTab === item.id ? styles.navItemActive : ""}`}
      onClick={() => handleTabClick(item.id)}
      title={collapsed ? item.label : undefined}
    >
      <div className={styles.iconWrap}>
        {item.icon}
        {isConfigured(item.checkConfigured) && (
          <CheckmarkBadgeIcon className={styles.checkmark} width={10} height={10} />
        )}
        {collapsed && hasWarning(item) && (
          <span className={styles.warningDot} />
        )}
      </div>
      {!collapsed && (
        <span className={styles.label}>
          {item.label}
          {item.id === "dictionary" && showDictionaryDot && <NewDot />}
          <WarningBadge show={
            (item.requiresModel === true && !setupComplete)
            || (item.requiresPermissions === true && needsPermissions())
            || (item.requiresTest === true && effectiveLlmEnhancement === true && !isConfigured("ai-enhancement"))
            || (item.requiresLlm === true && !isConfigured("ai-enhancement"))
          } />
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
            className={styles.logoWordmark}
            draggable={false}
            onClick={() => window.voxApi.shell.openExternal(VOX_WEBSITE_URL)}
            title={t("sidebar.visitWebsite")}
          />
        )}
        <button
          className={styles.collapseBtn}
          onClick={() => {
            setCollapsed((v) => {
              const next = !v;
              localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
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
            {!cat.label && i > 0 && <div className={styles.divider} />}
            {cat.label && !collapsed && (
              <div className={styles.categoryLabel}>{cat.label}</div>
            )}
            {cat.items.map(renderItem)}
          </div>
        ))}
      </nav>

      <div className={styles.bottom}>
        {import.meta.env.DEV && (
          <>
            <button
              className={`${styles.navItem} ${styles.devItem} ${activeTab === "dev" ? styles.devItemActive : ""} ${hideDevVisuals === true ? styles.devHidden : ""}`}
              onClick={() => handleTabClick("dev")}
              title={collapsed ? "Dev Panel" : undefined}
            >
              <div className={styles.iconWrap}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
                {devOverridesActive && (
                  <span className={styles.devOverrideDot} />
                )}
              </div>
              {!collapsed && (
                <span className={styles.label}>
                  {"Dev Panel"}
                  {devOverridesActive && (
                    // eslint-disable-next-line i18next/no-literal-string
                    <span className={styles.devOverrideLabel}>Overriding</span>
                  )}
                </span>
              )}
            </button>
            <div className={styles.divider} />
          </>
        )}
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
        {collapsed && iconSrc && (
          <div className={styles.collapsedLogo}>
            <img
              alt="Vox"
              src={iconSrc}
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
