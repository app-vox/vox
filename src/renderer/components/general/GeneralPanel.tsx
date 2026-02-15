import { type ReactNode } from "react";
import { useConfigStore } from "../../stores/config-store";
import { useSaveToast } from "../../hooks/use-save-toast";
import { usePermissions } from "../../hooks/use-permissions";
import { useDevOverrideValue } from "../../hooks/use-dev-override";
import { useT } from "../../i18n-context";
import { SUPPORTED_LANGUAGES } from "../../../shared/i18n";
import { SunIcon, MoonIcon, MonitorIcon, MicIcon, ShieldIcon, ChevronDownIcon } from "../../../shared/icons";
import type { ThemeMode, SupportedLanguage } from "../../../shared/config";
import { CustomSelect, type SelectItem } from "../ui/CustomSelect";
import { OfflineBanner } from "../ui/OfflineBanner";
import card from "../shared/card.module.scss";
import buttons from "../shared/buttons.module.scss";
import styles from "./GeneralPanel.module.scss";

const THEME_ICONS: { value: ThemeMode; icon: ReactNode }[] = [
  { value: "light", icon: <SunIcon width={16} height={16} /> },
  { value: "dark", icon: <MoonIcon width={16} height={16} /> },
  { value: "system", icon: <MonitorIcon width={16} height={16} /> },
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

function previewCue(cue: string) {
  window.voxApi.audio.previewCue(cue).catch(() => {});
}

export function GeneralPanel() {
  const t = useT();
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const saveConfig = useConfigStore((s) => s.saveConfig);
  const realSetupComplete = useConfigStore((s) => s.setupComplete);
  const loading = useConfigStore((s) => s.loading);
  const setActiveTab = useConfigStore((s) => s.setActiveTab);
  const triggerToast = useSaveToast((s) => s.trigger);
  const { status: realStatus } = usePermissions();

  // Dev overrides (gated — tree-shaken in production)
  const setupComplete = import.meta.env.DEV
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useDevOverrideValue("setupComplete", realSetupComplete)
    : realSetupComplete;

  const devMicOverride = import.meta.env.DEV
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useDevOverrideValue("microphonePermission", undefined)
    : undefined;

  const devAccOverride = import.meta.env.DEV
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useDevOverrideValue("accessibilityPermission", undefined)
    : undefined;

  const permissionStatus = {
    ...realStatus,
    ...(devMicOverride !== undefined ? { microphone: devMicOverride } : {}),
    ...(devAccOverride !== undefined ? { accessibility: devAccOverride } : {}),
  };

  const themeLabels: Record<ThemeMode, string> = {
    light: t("general.theme.light"),
    dark: t("general.theme.dark"),
    system: t("general.theme.system"),
  };

  const soundItems: SelectItem[] = [
    { value: "none", label: t("general.recordingFeedback.audioCue.none") },
    { divider: true },
    { value: "beep", label: t("general.recordingFeedback.audioCue.beep") },
    { value: "chime", label: t("general.recordingFeedback.audioCue.chime") },
    { value: "click", label: t("general.recordingFeedback.audioCue.click") },
    { value: "ding", label: t("general.recordingFeedback.sound.ding") },
    { value: "nudge", label: t("general.recordingFeedback.sound.nudge") },
    { value: "ping", label: t("general.recordingFeedback.sound.ping") },
    { value: "pop", label: t("general.recordingFeedback.sound.pop") },
    { value: "tap", label: t("general.recordingFeedback.sound.tap") },
    { value: "tick", label: t("general.recordingFeedback.sound.tick") },
  ];

  const errorSoundItems: SelectItem[] = [
    { value: "none", label: t("general.recordingFeedback.audioCue.none") },
    { divider: true },
    { value: "error", label: t("general.recordingFeedback.sound.error") },
  ];

  const languageItems: SelectItem[] = [
    { value: "system", label: t("general.language.system") },
    ...SUPPORTED_LANGUAGES.map((lang) => ({
      value: lang,
      label: LANGUAGE_NAMES[lang],
    })),
  ];

  const isDevMode = import.meta.env.DEV;

  const needsPermissions = !loading && setupComplete && permissionStatus !== null && (permissionStatus.accessibility !== true || permissionStatus.microphone !== "granted");

  if (!config) return null;

  const handleSoundChange = async (field: "recordingAudioCue" | "recordingStopAudioCue" | "errorAudioCue", cue: string) => {
    updateConfig({ [field]: cue });
    await saveConfig(false);
    triggerToast();
  };

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
      <OfflineBanner />

      {!loading && !setupComplete && (
        <div className={`${card.card} ${styles.setupBanner}`}>
          <div className={card.body}>
            <div className={styles.setupContent}>
              <div className={styles.setupIcon}>
                <MicIcon width={20} height={20} />
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

      {needsPermissions && (
        <div className={`${card.card} ${styles.setupBanner}`}>
          <div className={card.body}>
            <div className={styles.setupContent}>
              <div className={styles.setupIcon}>
                <ShieldIcon width={20} height={20} />
              </div>
              <div>
                <div className={styles.setupTitle}>{t("general.permissions.title")}</div>
                <div className={styles.setupDesc}>{t("general.permissions.description")}</div>
              </div>
              <button
                className={`${buttons.btn} ${buttons.primary}`}
                onClick={() => setActiveTab("permissions")}
              >
                {t("general.permissions.action")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={card.card}>
        <div className={card.header}>
          <h2>{t("general.hud.title")}</h2>
          <p className={card.description}>{t("general.hud.description")}</p>
        </div>
        <div className={card.body}>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={config.showHud}
              onChange={async () => {
                const newShowHud = !config.showHud;
                updateConfig({
                  showHud: newShowHud,
                  ...(newShowHud ? {} : { hudShowOnHover: false }),
                });
                await saveConfig(false);
                triggerToast();
              }}
            />
            <div>
              <div className={styles.checkboxLabel}>{t("general.hud.showHud")}</div>
              <div className={styles.checkboxDesc}>{t("general.hud.showHudDesc")}</div>
            </div>
          </label>

          <label className={`${styles.checkboxRow} ${styles.subCheckbox} ${!config.showHud ? styles.disabled : ""}`}>
            <input
              type="checkbox"
              checked={config.hudShowOnHover}
              disabled={!config.showHud}
              onChange={async () => {
                updateConfig({ hudShowOnHover: !config.hudShowOnHover });
                await saveConfig(false);
                triggerToast();
              }}
            />
            <div>
              <div className={styles.checkboxLabel}>{t("general.hud.showOnHover")}</div>
              <div className={styles.checkboxDesc}>{t("general.hud.showOnHoverDesc")}</div>
            </div>
          </label>
        </div>
      </div>

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
          <CustomSelect
            value={config.language}
            items={languageItems}
            onChange={(val) => {
              updateConfig({ language: val as SupportedLanguage | "system" });
              saveConfig(false).then(() => triggerToast());
            }}
          />
        </div>
      </div>

      <details className={card.collapsible}>
        <summary className={card.collapsibleHeader}>
          <div>
            <h2>{t("general.recordingFeedback.title")}</h2>
            <p className={card.description}>{t("general.recordingFeedback.description")}</p>
          </div>
          <ChevronDownIcon width={16} height={16} className={card.chevron} />
        </summary>
        <div className={card.body}>
          <div className={styles.fieldRow}>
            <label htmlFor="recording-start-sound">{t("general.recordingFeedback.startSound")}</label>
            <CustomSelect
              id="recording-start-sound"
              value={config.recordingAudioCue ?? "tap"}
              items={soundItems}
              onChange={(val) => handleSoundChange("recordingAudioCue", val)}
              onPreview={previewCue}
            />
          </div>
          <div className={styles.fieldRow}>
            <label htmlFor="recording-stop-sound">{t("general.recordingFeedback.stopSound")}</label>
            <CustomSelect
              id="recording-stop-sound"
              value={config.recordingStopAudioCue ?? "pop"}
              items={soundItems}
              onChange={(val) => handleSoundChange("recordingStopAudioCue", val)}
              onPreview={previewCue}
            />
          </div>
          <div className={styles.fieldRow}>
            <label htmlFor="recording-error-sound">{t("general.recordingFeedback.errorSound")}</label>
            <CustomSelect
              id="recording-error-sound"
              value={config.errorAudioCue ?? "error"}
              items={errorSoundItems}
              onChange={(val) => handleSoundChange("errorAudioCue", val)}
              onPreview={previewCue}
            />
          </div>
        </div>
      </details>

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
        <div className={card.header}>
          <h2>{t("general.analytics.title")}</h2>
          <p className={card.description}>{t("general.analytics.description")}</p>
        </div>
        <div className={card.body}>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={config.analyticsEnabled}
              onChange={async () => {
                updateConfig({ analyticsEnabled: !config.analyticsEnabled });
                await saveConfig(false);
                triggerToast();
              }}
            />
            <div>
              <div className={styles.checkboxLabel}>{t("general.analytics.enable")}</div>
              <div className={styles.checkboxDesc}>{t("general.analytics.hint")}</div>
            </div>
          </label>
        </div>
      </div>
    </>
  );
}
