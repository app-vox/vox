import { type ReactNode } from "react";
import { useConfigStore } from "../../stores/config-store";
import { useSaveToast } from "../../hooks/use-save-toast";
import { useT } from "../../i18n-context";
import { SUPPORTED_LANGUAGES } from "../../../shared/i18n";
import { SunIcon, MoonIcon, MonitorIcon, MicIcon } from "../../../shared/icons";
import type { ThemeMode, SupportedLanguage, AudioCueType } from "../../../shared/config";
import { generateCueSamples } from "../../../shared/audio-cue";
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


  const audioCueOptions: { value: AudioCueType; labelKey: string }[] = [
    { value: "click", labelKey: "general.recordingFeedback.audioCue.click" },
    { value: "beep", labelKey: "general.recordingFeedback.audioCue.beep" },
    { value: "chime", labelKey: "general.recordingFeedback.audioCue.chime" },
    { value: "none", labelKey: "general.recordingFeedback.audioCue.none" },
  ];

  const isDevMode = import.meta.env.DEV;

  if (!config) return null;

  const setAudioCue = async (cue: AudioCueType) => {
    updateConfig({ recordingAudioCue: cue });
    await saveConfig(false);
    triggerToast();

    if (cue !== "none") {
      const ctx = new AudioContext();
      const samples = generateCueSamples(cue, ctx.sampleRate);
      const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
      buffer.getChannelData(0).set(new Float32Array(samples));
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
      source.onended = () => ctx.close();
    }
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
      {!setupComplete && (
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
          <h2>{t("general.recordingFeedback.title")}</h2>
          <p className={card.description}>{t("general.recordingFeedback.audioCue.description")}</p>
        </div>
        <div className={card.body}>
          <select
            value={config.recordingAudioCue ?? "click"}
            onChange={(e) => setAudioCue(e.target.value as AudioCueType)}
          >
            {audioCueOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
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
