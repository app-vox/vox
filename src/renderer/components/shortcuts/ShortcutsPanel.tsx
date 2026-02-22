import { useEffect } from "react";
import { useConfigStore } from "../../stores/config-store";
import { useSaveToast } from "../../hooks/use-save-toast";
import { useT } from "../../i18n-context";
import type { ShortcutMode } from "../../../shared/config";
import { ShortcutRecorder } from "./ShortcutRecorder";
import card from "../shared/card.module.scss";
import btn from "../shared/buttons.module.scss";
import styles from "./ShortcutsPanel.module.scss";

const MODES: ShortcutMode[] = ["hold", "toggle", "both"];

export function ShortcutsPanel() {
  useEffect(() => {
    localStorage.setItem("vox:visited-shortcuts", "true");
  }, []);
  const t = useT();
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const saveConfig = useConfigStore((s) => s.saveConfig);
  const triggerToast = useSaveToast((s) => s.trigger);

  if (!config) return null;

  const mode = config.shortcuts.mode ?? "hold";

  const setMode = async (newMode: ShortcutMode) => {
    updateConfig({ shortcuts: { ...config.shortcuts, mode: newMode } });
    await saveConfig(false);
    triggerToast();
  };

  const setHold = async (accelerator: string) => {
    updateConfig({ shortcuts: { ...config.shortcuts, hold: accelerator } });
    await saveConfig(false);
    triggerToast();
  };

  const setToggle = async (accelerator: string) => {
    updateConfig({ shortcuts: { ...config.shortcuts, toggle: accelerator } });
    await saveConfig(false);
    triggerToast();
  };

  const restoreDefaults = async () => {
    updateConfig({ shortcuts: { mode: "hold", hold: "Alt+Space", toggle: "Alt+Shift+Space" } });
    await saveConfig(false);
    triggerToast();
  };

  const modeLabels: Record<ShortcutMode, string> = {
    hold: t("shortcuts.mode.hold"),
    toggle: t("shortcuts.mode.toggle"),
    both: t("shortcuts.mode.both"),
  };

  return (
    <div className={card.card}>
      <div className={card.header}>
        <h2>{t("shortcuts.title")}</h2>
        <p className={card.description}>{t("shortcuts.description")}</p>
      </div>
      <div className={card.body}>
        <div className={styles.modeSelector}>
          <p className={styles.modeLabel}>{t("shortcuts.mode")}</p>
          <div className={styles.segmented}>
            {MODES.map((m) => (
              <button
                key={m}
                className={`${styles.segment} ${mode === m ? styles.active : ""}`}
                onClick={() => setMode(m)}
              >
                {modeLabels[m]}
              </button>
            ))}
          </div>
        </div>

        <ShortcutRecorder
          label={t("shortcuts.holdMode")}
          hint={t("shortcuts.holdHint")}
          value={config.shortcuts.hold}
          otherValue={config.shortcuts.toggle}
          onChange={setHold}
          disabled={mode === "toggle"}
        />
        <ShortcutRecorder
          label={t("shortcuts.toggleMode")}
          hint={t("shortcuts.toggleHint")}
          value={config.shortcuts.toggle}
          otherValue={config.shortcuts.hold}
          onChange={setToggle}
          disabled={mode === "hold"}
        />

        <button
          onClick={restoreDefaults}
          className={`${btn.btn} ${btn.secondary} ${btn.sm}`}
          style={{ marginTop: 8 }}
        >
          {t("shortcuts.restoreDefaults")}
        </button>
      </div>
    </div>
  );
}
