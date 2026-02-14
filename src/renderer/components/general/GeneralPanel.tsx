import { type ReactNode } from "react";
import { useConfigStore } from "../../stores/config-store";
import { useSaveToast } from "../../hooks/use-save-toast";
import { useT } from "../../i18n-context";
import { SUPPORTED_LANGUAGES } from "../../../shared/i18n";
import type { ThemeMode, SupportedLanguage } from "../../../shared/config";
import card from "../shared/card.module.scss";
import buttons from "../shared/buttons.module.scss";
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
  pl: "Polski",
  ru: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439",
  tr: "T\u00fcrk\u00e7e",
};

export function GeneralPanel() {
  const t = useT();
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const saveConfig = useConfigStore((s) => s.saveConfig);
  const setupComplete = useConfigStore((s) => s.setupComplete);
  const setActiveTab = useConfigStore((s) => s.setActiveTab);
  const triggerToast = useSaveToast((s) => s.trigger);

  const themeLabels: Record<ThemeMode, string> = {
    light: t("general.theme.light"),
    dark: t("general.theme.dark"),
    system: t("general.theme.system"),
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

  return (
    <>
      {!setupComplete && (
        <div className={`${card.card} ${styles.setupBanner}`}>
          <div className={card.body}>
            <div className={styles.setupContent}>
              <div className={styles.setupIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </div>
              <div>
                <div className={styles.setupTitle}>{t("general.setup.title")}</div>
                <div className={styles.setupDesc}>{t("general.setup.description")}</div>
              </div>
              <button
                className={`${buttons.btn} ${buttons.primary}`}
                onClick={() => setActiveTab("whisper")}
              >
                {t("general.setup.getStarted")}
              </button>
            </div>
          </div>
        </div>
      )}

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
    </>
  );
}
