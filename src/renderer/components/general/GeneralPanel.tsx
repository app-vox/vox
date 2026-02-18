import { type ReactNode, useState, useRef, useCallback, useEffect } from "react";
import { useConfigStore } from "../../stores/config-store";
import { useSaveToast } from "../../hooks/use-save-toast";
import { usePermissions } from "../../hooks/use-permissions";
import { useDevOverrideValue } from "../../hooks/use-dev-override";
import { useT } from "../../i18n-context";
import { SUPPORTED_LANGUAGES } from "../../../shared/i18n";
import { WHISPER_LANGUAGES } from "../../../shared/constants";
import { useOnboardingStore } from "../onboarding/use-onboarding-store";
import type { OnboardingStep } from "../onboarding/use-onboarding-store";
import { SunIcon, MoonIcon, MonitorIcon, MicIcon, ShieldIcon, KeyboardIcon, ChevronDownIcon, MoveIcon, RefreshIcon, InfoCircleIcon } from "../../../shared/icons";
import type { ThemeMode, SupportedLanguage, WidgetPosition } from "../../../shared/config";
import { CustomSelect, type SelectItem } from "../ui/CustomSelect";
import { OfflineBanner } from "../ui/OfflineBanner";
import card from "../shared/card.module.scss";
import buttons from "../shared/buttons.module.scss";
import styles from "./GeneralPanel.module.scss";

const DISPLAY_COLLAPSED_KEY = "vox:display-collapsed";
const HUD_BANNER_DISMISSED_KEY = "vox:hud-banner-dismissed";
const SHORTCUTS_BANNER_DISMISSED_KEY = "vox:shortcuts-banner-dismissed";
const VISITED_SHORTCUTS_KEY = "vox:visited-shortcuts";

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

  const onboardingOpen = useOnboardingStore((s) => s.forceOpen);
  const bannersReady = !loading && realStatus !== null;
  const needsSetup = !setupComplete || permissionStatus.microphone !== "granted" || permissionStatus.accessibility !== true;

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

  const positionItems: SelectItem[] = [
    { value: "top-left", label: t("general.position.topLeft") },
    { value: "top-center", label: t("general.position.topCenter") },
    { value: "top-right", label: t("general.position.topRight") },
    { divider: true },
    { value: "center-left", label: t("general.position.centerLeft") },
    { value: "center-center", label: t("general.position.centerCenter") },
    { value: "center-right", label: t("general.position.centerRight") },
    { divider: true },
    { value: "bottom-left", label: t("general.position.bottomLeft") },
    { value: "bottom-center", label: `${t("general.position.bottomCenter")} ${t("general.position.default")}` },
    { value: "bottom-right", label: t("general.position.bottomRight") },
    { divider: true },
    { value: "custom", label: t("general.position.custom") },
  ];

  const [displayCollapsed, setDisplayCollapsed] = useState(() => localStorage.getItem(DISPLAY_COLLAPSED_KEY) !== "false");
  const [perfCollapsed, setPerfCollapsed] = useState(true);
  const [hudBannerDismissed, setHudBannerDismissed] = useState(() => localStorage.getItem(HUD_BANNER_DISMISSED_KEY) === "true");
  const [shortcutsBannerDismissedLocal, setShortcutsBannerDismissed] = useState(() =>
    localStorage.getItem(SHORTCUTS_BANNER_DISMISSED_KEY) === "true" || localStorage.getItem(VISITED_SHORTCUTS_KEY) === "true"
  );

  const devVisitedShortcuts = import.meta.env.DEV
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useDevOverrideValue("visitedShortcuts", undefined)
    : undefined;
  const shortcutsBannerDismissed = devVisitedShortcuts !== undefined ? devVisitedShortcuts : shortcutsBannerDismissedLocal;
  const [availableDisplays, setAvailableDisplays] = useState<{ id: number; label: string; primary: boolean }[]>([]);
  const [flashHudSelect, setFlashHudSelect] = useState(false);
  const [flashPreview, setFlashPreview] = useState(false);
  const [hudDragPos, setHudDragPos] = useState<{ x: number; y: number } | null>(null);
  const [hudHighlight, setHudHighlight] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);

  const isDevMode = import.meta.env.DEV;

  const needsPermissions = bannersReady && setupComplete && (permissionStatus.accessibility !== true || permissionStatus.microphone !== "granted");

  const flashSelect = useCallback(() => {
    setFlashHudSelect(true);
    setTimeout(() => setFlashHudSelect(false), 400);
  }, []);

  const getPreviewPosition = useCallback((pos: WidgetPosition) => {
    if (pos === "custom") return null;
    return pos;
  }, []);

  const handlePreviewMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;

    const computePos = (ev: { clientX: number; clientY: number }) => ({
      x: Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (ev.clientY - rect.top) / rect.height)),
    });

    setHudDragPos(computePos(e));
    setHudHighlight(true);

    const onMove = (ev: MouseEvent) => {
      setHudDragPos(computePos(ev));
    };

    const onUp = (ev: MouseEvent) => {
      const pos = computePos(ev);
      setHudDragPos(null);
      setHudHighlight(false);
      const wasCustom = config?.hudPosition === "custom";
      updateConfig({ hudPosition: "custom", hudCustomX: pos.x, hudCustomY: pos.y });
      if (!wasCustom) flashSelect();
      saveConfig(false).then(() => triggerToast());
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [config?.hudPosition, updateConfig, saveConfig, triggerToast, flashSelect]);

  useEffect(() => {
    window.voxApi.displays.getAll().then(setAvailableDisplays).catch(() => {});
  }, []);

  if (!config) return null;

  const handleHudPositionChange = async (val: string) => {
    const newPos = val as WidgetPosition;
    const prevPos = config.hudPosition;
    updateConfig({ hudPosition: newPos });
    await saveConfig(false);
    triggerToast();
    if (prevPos !== "custom") {
      setHudHighlight(true);
      setTimeout(() => setHudHighlight(false), 400);
    }
  };

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

  const handleRestoreDefaults = async () => {
    updateConfig({
      hudPosition: "bottom-center",
      hudCustomX: 0.5,
      hudCustomY: 0.9,
    });
    await saveConfig(false);
    triggerToast();
    flashSelect();
    setFlashPreview(true);
    setTimeout(() => setFlashPreview(false), 400);
  };

  const hudPreviewPos = getPreviewPosition(config.hudPosition);

  return (
    <>
      <OfflineBanner />

      <div className={styles.rerunSetupRow}>
        <button
          className={styles.rerunSetup}
          title={t("onboarding.rerun.description")}
          onClick={async () => {
            const store = useOnboardingStore.getState();

            if (needsSetup) {
              let startStep = 0;
              if (!setupComplete) startStep = 1;
              else if (permissionStatus.microphone !== "granted" || permissionStatus.accessibility !== true) startStep = 2;
              store.setStep(startStep as OnboardingStep);
            } else {
              store.reset();
            }

            store.setForceOpen(true);
            updateConfig({ onboardingCompleted: false });
            await saveConfig(false);
          }}
        >
          <InfoCircleIcon width={14} height={14} />
          {bannersReady && needsSetup ? t("onboarding.rerun.complete") : t("onboarding.rerun.link")}
        </button>
      </div>

      {bannersReady && !setupComplete && (
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

      {/* Shortcuts discovery banner */}
      {bannersReady && setupComplete && !shortcutsBannerDismissed && !onboardingOpen && (devVisitedShortcuts === false || !config.onboardingCompleted) && (
        <div className={`${card.card} ${styles.setupBanner}`}>
          <div className={card.body}>
            <div className={styles.hudBannerContent}>
              <div className={styles.setupIcon}>
                <KeyboardIcon width={20} height={20} />
              </div>
              <div className={styles.hudBannerText}>
                <div className={styles.setupTitle}>{t("general.shortcuts.banner.title")}</div>
                <div className={styles.setupDesc}>{t("general.shortcuts.banner.description")}</div>
                <div className={styles.hudBannerActions}>
                  <button
                    className={`${buttons.btn} ${buttons.primary}`}
                    onClick={() => {
                      setActiveTab("shortcuts");
                      setShortcutsBannerDismissed(true);
                      localStorage.setItem(SHORTCUTS_BANNER_DISMISSED_KEY, "true");
                    }}
                  >
                    {t("general.shortcuts.banner.action")}
                  </button>
                  <button
                    className={`${buttons.btn} ${buttons.secondary}`}
                    onClick={() => {
                      setShortcutsBannerDismissed(true);
                      localStorage.setItem(SHORTCUTS_BANNER_DISMISSED_KEY, "true");
                    }}
                  >
                    {t("general.shortcuts.banner.dismiss")}
                  </button>
                </div>
              </div>
              <button
                className={styles.hudBannerClose}
                onClick={() => {
                  setShortcutsBannerDismissed(true);
                  localStorage.setItem(SHORTCUTS_BANNER_DISMISSED_KEY, "true");
                }}
                aria-label="Close"
                title={t("general.shortcuts.banner.dismiss")}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M8 2L2 8M2 2L8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Languages */}
      <div className={card.card}>
        <div className={card.header}>
          <h2>{t("general.languages.title")}</h2>
          <p className={card.description}>{t("general.languages.description")}</p>
        </div>
        <div className={card.body}>
          <div className={styles.fieldRow}>
            <label>{t("general.language.title")}</label>
            <CustomSelect
              value={config.language}
              items={languageItems}
              onChange={(val) => {
                updateConfig({ language: val as SupportedLanguage | "system" });
                saveConfig(false).then(() => triggerToast());
              }}
            />
          </div>

          {setupComplete && (
            <>
              <div className={styles.sectionDivider} />
              <div className={styles.fieldRow}>
                <label>{t("general.speechLanguages.title")}</label>
                <p className={styles.speechHint}>{t("general.speechLanguages.description")}</p>

                {config.speechLanguages.length > 0 && (
                  <div className={styles.chipList}>
                    {config.speechLanguages.map((code) => {
                      const lang = WHISPER_LANGUAGES.find((l) => l.code === code);
                      return (
                        <span key={code} className={styles.chip}>
                          {lang?.name ?? code}
                          <button
                            className={styles.chipRemove}
                            onClick={() => {
                              updateConfig({
                                speechLanguages: config.speechLanguages.filter((c) => c !== code),
                              });
                              void saveConfig(false);
                            }}
                            aria-label={t("general.speechLanguages.remove", { language: lang?.name ?? code })}
                          >
                            {/* eslint-disable-next-line i18next/no-literal-string */}
                            <span aria-hidden="true">&times;</span>
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                <CustomSelect
                  value=""
                  items={WHISPER_LANGUAGES
                    .filter((l) => !config.speechLanguages.includes(l.code))
                    .map((l) => ({ value: l.code, label: l.name }))}
                  onChange={(val) => {
                    if (!val || config.speechLanguages.includes(val)) return;
                    updateConfig({
                      speechLanguages: [...config.speechLanguages, val],
                    });
                    void saveConfig(false);
                  }}
                />

                {config.speechLanguages.length === 1 && (
                  <p className={styles.speechHint}>{t("general.speechLanguages.hintSingle")}</p>
                )}
                {config.speechLanguages.length > 1 && (
                  <p className={styles.speechHint}>{t("general.speechLanguages.hintMultiple")}</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* HUD discovery banner */}
      {bannersReady && setupComplete && !config.showHud && !hudBannerDismissed && (
        <div className={`${card.card} ${styles.setupBanner}`}>
          <div className={card.body}>
            <div className={styles.hudBannerContent}>
              <div className={styles.setupIcon}>
                <MicIcon width={20} height={20} />
              </div>
              <div className={styles.hudBannerText}>
                <div className={styles.setupTitle}>{t("general.hud.banner.title")}</div>
                <div className={styles.setupDesc}>{t("general.hud.banner.description")}</div>
                <div className={styles.hudBannerActions}>
                  <button
                    className={`${buttons.btn} ${buttons.primary}`}
                    onClick={async () => {
                      updateConfig({ showHud: true, showHudActions: true });
                      await saveConfig(false);
                      triggerToast();
                      setDisplayCollapsed(false);
                      localStorage.setItem(DISPLAY_COLLAPSED_KEY, "false");
                      setHudBannerDismissed(true);
                      localStorage.setItem(HUD_BANNER_DISMISSED_KEY, "true");
                    }}
                  >
                    {t("general.hud.banner.enable")}
                  </button>
                  <button
                    className={`${buttons.btn} ${buttons.secondary}`}
                    onClick={() => {
                      setHudBannerDismissed(true);
                      localStorage.setItem(HUD_BANNER_DISMISSED_KEY, "true");
                    }}
                  >
                    {t("general.hud.banner.dismiss")}
                  </button>
                </div>
              </div>
              <button
                className={styles.hudBannerClose}
                onClick={() => {
                  setHudBannerDismissed(true);
                  localStorage.setItem(HUD_BANNER_DISMISSED_KEY, "true");
                }}
                aria-label="Close"
                title={t("general.hud.banner.dismiss")}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M8 2L2 8M2 2L8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HUD */}
      <div className={card.card}>
        <button
          className={styles.collapsibleHeader}
          onClick={() => {
            setDisplayCollapsed((prev) => {
              const next = !prev;
              localStorage.setItem(DISPLAY_COLLAPSED_KEY, String(next));
              return next;
            });
          }}
          aria-expanded={!displayCollapsed}
        >
          <div>
            <h2>{t("general.hud.title")}</h2>
            <p className={card.description}>{t("general.hud.description")}</p>
          </div>
          <ChevronDownIcon
            width={16}
            height={16}
            className={`${styles.collapseChevron} ${displayCollapsed ? styles.collapsed : ""}`}
          />
        </button>
        {!displayCollapsed && (
          <div className={card.body}>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={config.showHud}
                onChange={async () => {
                  const newShowHud = !config.showHud;
                  updateConfig({
                    showHud: newShowHud,
                    ...(newShowHud ? { showHudActions: true } : { showHudActions: false }),
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

            <label className={`${styles.checkboxRow} ${!config.showHud ? styles.disabled : ""}`}>
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

            <label className={`${styles.checkboxRow} ${!config.showHud ? styles.disabled : ""}`}>
              <input
                type="checkbox"
                checked={config.showHudActions}
                disabled={!config.showHud}
                onChange={async () => {
                  updateConfig({ showHudActions: !config.showHudActions });
                  await saveConfig(false);
                  triggerToast();
                }}
              />
              <div>
                <div className={styles.checkboxLabel}>{t("general.hud.showActionsOnHover")}</div>
                <div className={styles.checkboxDesc}>{t("general.hud.showActionsOnHoverDesc")}</div>
              </div>
            </label>

            <div className={styles.hudSettingsRow}>
              <div className={styles.hudSelectsCol}>
                <div className={styles.selectFieldRow}>
                  <div className={styles.selectLabel}>{t("general.hud.position")}</div>
                  <div className={flashHudSelect ? styles.flash : undefined}>
                    <CustomSelect
                      value={config.hudPosition}
                      items={positionItems}
                      onChange={handleHudPositionChange}
                    />
                  </div>
                </div>

                {availableDisplays.length > 1 && (
                  <div className={styles.selectFieldRow}>
                    <div className={styles.selectLabel}>{t("general.hud.targetDisplay")}</div>
                    <CustomSelect
                      value={config.targetDisplayId != null ? String(config.targetDisplayId) : "system"}
                      items={[
                        { value: "system", label: t("general.hud.systemDefault") },
                        { divider: true },
                        ...availableDisplays.map((d) => ({
                          value: String(d.id),
                          label: d.primary ? `${d.label} (${t("general.hud.primaryDisplay")})` : d.label,
                        })),
                      ]}
                      onChange={async (val) => {
                        const newId = val === "system" ? null : Number(val);
                        updateConfig({ targetDisplayId: newId });
                        await saveConfig(false);
                        triggerToast();
                      }}
                    />
                  </div>
                )}
              </div>

              <div className={styles.previewSide}>
                <div className={styles.previewTitle}>{t("general.preview.title")}</div>
                <div
                  className={`${styles.previewScreen} ${flashPreview ? styles.flash : ""}`}
                  ref={previewRef}
                  onMouseDown={handlePreviewMouseDown}
                >
                  <div
                    className={[
                      styles.previewHud,
                      hudDragPos ? styles.dragging : hudHighlight ? styles.highlight : "",
                      !config.showHud ? styles.pillShape : config.showHud ? styles.previewHudAnimated : "",
                      hudDragPos || !hudPreviewPos ? "" : (styles[`previewHud_${hudPreviewPos.replace(/-/g, "_")}`] || styles.previewHud_bottom_center),
                    ].filter(Boolean).join(" ")}
                    style={hudDragPos
                      ? { left: `${hudDragPos.x * 100}%`, top: `${hudDragPos.y * 100}%`, transform: "translate(-50%, -50%)", cursor: "grabbing", transition: "box-shadow 0.15s ease" }
                      : !hudPreviewPos
                        ? { left: `${(config.hudCustomX ?? 0.5) * 100}%`, top: `${(config.hudCustomY ?? 0.9) * 100}%`, transform: "translate(-50%, -50%)", cursor: "grab" }
                        : { cursor: "grab" }
                    }
                  />
                </div>
                <div className={styles.dragHint}>
                  <MoveIcon width={12} height={12} />
                  <span>{t("general.preview.dragHint")}</span>
                </div>
              </div>
            </div>

            <div className={styles.restoreDefaultsRow}>
              <button
                type="button"
                className={styles.restoreDefaults}
                onClick={handleRestoreDefaults}
              >
                <RefreshIcon width={12} height={12} />
                <span>{t("general.hud.restoreDefaults")}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Theme */}
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

      <div className={card.card}>
        <button
          className={styles.collapsibleHeader}
          onClick={() => {
            setPerfCollapsed((prev) => !prev);
          }}
          aria-expanded={!perfCollapsed}
        >
          <div>
            <h2>{t("general.performance.title")}</h2>
            <p className={card.description}>{t("general.performance.description")}</p>
          </div>
          <ChevronDownIcon
            width={16}
            height={16}
            className={`${styles.collapseChevron} ${perfCollapsed ? styles.collapsed : ""}`}
          />
        </button>
        {!perfCollapsed && (
          <div className={card.body}>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={config.reduceAnimations}
                onChange={async () => {
                  updateConfig({ reduceAnimations: !config.reduceAnimations });
                  await saveConfig(false);
                  triggerToast();
                }}
              />
              <div>
                <div className={styles.checkboxLabel}>{t("general.performance.reduceAnimations")}</div>
                <div className={styles.checkboxDesc}>{t("general.performance.reduceAnimationsHint")}</div>
              </div>
            </label>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={config.reduceVisualEffects}
                onChange={async () => {
                  updateConfig({ reduceVisualEffects: !config.reduceVisualEffects });
                  await saveConfig(false);
                  triggerToast();
                }}
              />
              <div>
                <div className={styles.checkboxLabel}>{t("general.performance.reduceVisualEffects")}</div>
                <div className={styles.checkboxDesc}>{t("general.performance.reduceVisualEffectsHint")}</div>
              </div>
            </label>
          </div>
        )}
      </div>
    </>
  );
}
