import { useState, useEffect, type ReactNode } from "react";
import { useConfigStore } from "../../stores/config-store";
import { useSaveToast } from "../../hooks/use-save-toast";
import { useT } from "../../i18n-context";
import { SUPPORTED_LANGUAGES } from "../../../shared/i18n";
import type { ThemeMode, SupportedLanguage } from "../../../shared/config";
import type { UpdateState } from "../../../preload/index";
import card from "../shared/card.module.scss";
import styles from "./GeneralPanel.module.scss";

const THEME_ICONS: { value: ThemeMode; icon: ReactNode }[] = [
  {
    value: "light",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    ),
  },
  {
    value: "dark",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ),
  },
  {
    value: "system",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
];

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: "English",
  "pt-BR": "Portugu\u00eas (Brasil)",
  "pt-PT": "Portugu\u00eas (Portugal)",
  es: "Espa\u00f1ol",
  fr: "Fran\u00e7ais",
  de: "Deutsch",
  it: "Italiano",
  ru: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439",
  tr: "T\u00fcrk\u00e7e",
};

export function GeneralPanel() {
  const t = useT();
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const saveConfig = useConfigStore((s) => s.saveConfig);
  const triggerToast = useSaveToast((s) => s.trigger);

  const [updateState, setUpdateState] = useState<UpdateState | null>(null);
  const [currentVersion, setCurrentVersion] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const themeLabels: Record<ThemeMode, string> = {
    light: t("general.theme.light"),
    dark: t("general.theme.dark"),
    system: t("general.theme.system"),
  };

  useEffect(() => {
    window.voxApi.updates.getVersion().then(setCurrentVersion);
    window.voxApi.updates.getState().then(setUpdateState);
    window.voxApi.resources.dataUrl("logo.png").then(setLogoUrl);
    const unsub = window.voxApi.updates.onStateChanged(setUpdateState);
    return unsub;
  }, []);

  const handleCheckForUpdates = async () => {
    await window.voxApi.updates.check();
  };

  const handleRestart = () => {
    window.voxApi.updates.quitAndInstall();
  };

  const isDevMode = import.meta.env.DEV;

  if (!config) return null;

  const setTheme = async (theme: ThemeMode) => {
    updateConfig({ theme });
    await saveConfig(false);
    triggerToast();
  };

  const toggleLaunchAtLogin = async () => {
    if (isDevMode) return;
    updateConfig({ launchAtLogin: !config.launchAtLogin });
    await saveConfig(false);
    triggerToast();
  };

  const openIssueTracker = () => {
    window.voxApi.shell.openExternal("https://github.com/app-vox/vox/issues");
  };

  const status = updateState?.status ?? "idle";
  const checking = status === "checking";
  const showUpdateBanner = status === "available" || status === "downloading" || status === "ready";

  return (
    <>
      <div className={card.card}>
        <div className={card.header}>
          <h2>{t("general.theme.title")}</h2>
          <p className={card.description}>{t("general.theme.description")}</p>
        </div>
        <div className={card.body}>
          <div className={styles.segmented}>
            {THEME_ICONS.map((opt) => (
              <button
                key={opt.value}
                className={`${styles.segment} ${config.theme === opt.value ? styles.active : ""}`}
                onClick={() => setTheme(opt.value)}
              >
                {opt.icon}
                <span>{themeLabels[opt.value]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={card.card}>
        <div className={card.header}>
          <h2>{t("general.language.title")}</h2>
          <p className={card.description}>{t("general.language.description")}</p>
        </div>
        <div className={card.body}>
          <select
            value={config.language}
            onChange={(e) => {
              updateConfig({ language: e.target.value as SupportedLanguage | "system" });
              saveConfig(false).then(() => triggerToast());
            }}
          >
            <option value="system">{t("general.language.system")}</option>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>{LANGUAGE_NAMES[lang]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={card.card}>
        <div className={card.header}>
          <h2>{t("general.startup.title")}</h2>
          <p className={card.description}>{t("general.startup.description")}</p>
        </div>
        <div className={card.body}>
          <label className={`${styles.checkboxRow} ${isDevMode ? styles.disabled : ""}`}>
            <input
              type="checkbox"
              checked={config.launchAtLogin}
              disabled={isDevMode}
              onChange={toggleLaunchAtLogin}
            />
            <div>
              <div className={styles.checkboxLabel}>{t("general.startup.launchAtLogin")}</div>
              <div className={styles.checkboxDesc}>
                {isDevMode
                  ? t("general.startup.devDisabled")
                  : t("general.startup.autoStart")
                }
              </div>
            </div>
          </label>
        </div>
      </div>

      <div className={card.card}>
        <div className={`${card.header} ${styles.aboutHeader}`}>
          <div>
            <h2>{t("general.about.title")}</h2>
            <p className={card.description}>
              {currentVersion ? `Vox v${currentVersion}` : t("general.about.versionInfo")}
            </p>
          </div>
          {logoUrl && <img src={logoUrl} alt="Vox" className={styles.aboutLogo} draggable={false} />}
        </div>
        <div className={card.body}>
          {showUpdateBanner ? (
            <>
              <div className={styles.updateBanner}>
                <div className={styles.updateBannerContent}>
                  {status === "ready" ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      <span>{t("general.about.readyToInstall", { version: updateState?.latestVersion ?? "" })}</span>
                    </>
                  ) : status === "downloading" ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                      <span>{t("general.about.downloading", { version: updateState?.latestVersion ?? "", progress: updateState?.downloadProgress ?? 0 })}</span>
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                      <span>{t("general.about.available", { version: updateState?.latestVersion ?? "" })}</span>
                    </>
                  )}
                </div>
                {status === "downloading" && (
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${updateState?.downloadProgress ?? 0}%` }}
                    />
                  </div>
                )}
                <div className={styles.updateBannerActions}>
                  {status === "ready" ? (
                    <button onClick={handleRestart} className={styles.downloadButton}>
                      {t("general.about.restartNow")}
                    </button>
                  ) : status === "available" && isDevMode && updateState?.releaseUrl ? (
                    <button
                      onClick={() => window.voxApi.shell.openExternal(updateState.releaseUrl)}
                      className={styles.downloadButton}
                    >
                      {t("general.about.download")}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </button>
                  ) : null}
                </div>
              </div>
              <button onClick={openIssueTracker} className={styles.reportIssueBelow}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{t("general.about.reportIssue")}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <div className={styles.aboutActions}>
                <div className={styles.checkForUpdatesCol}>
                  <button
                    onClick={handleCheckForUpdates}
                    disabled={checking}
                    className={styles.aboutButton}
                  >
                    {checking ? (
                      <>
                        <svg className={styles.spinner} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        <span>{t("general.about.checking")}</span>
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="23 4 23 10 17 10" />
                          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                        </svg>
                        <span>{t("general.about.checkForUpdates")}</span>
                      </>
                    )}
                  </button>
                  <div className={styles.updateStatus}>
                    {checking ? (
                      <span className={styles.updateChecking}>{t("general.about.checkingForUpdates")}</span>
                    ) : status === "idle" && updateState ? (
                      <span className={styles.upToDate}>{t("general.about.upToDate")}</span>
                    ) : status === "error" && updateState?.error ? (
                      <span className={styles.updateError}>{updateState.error}</span>
                    ) : null}
                  </div>
                </div>
                <button onClick={openIssueTracker} className={styles.aboutButton}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{t("general.about.reportIssue")}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
