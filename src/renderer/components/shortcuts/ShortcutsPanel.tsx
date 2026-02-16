import { useEffect } from "react";
import { useConfigStore } from "../../stores/config-store";
import { useSaveToast } from "../../hooks/use-save-toast";
import { useT } from "../../i18n-context";
import { ShortcutRecorder } from "./ShortcutRecorder";
import card from "../shared/card.module.scss";
import btn from "../shared/buttons.module.scss";

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
    updateConfig({ shortcuts: { hold: "Alt+Space", toggle: "Alt+Shift+Space" } });
    await saveConfig(false);
    triggerToast();
  };

  return (
    <div className={card.card}>
      <div className={card.header}>
        <h2>{t("shortcuts.title")}</h2>
        <p className={card.description}>{t("shortcuts.description")}</p>
      </div>
      <div className={card.body}>
        <ShortcutRecorder
          label={t("shortcuts.holdMode")}
          hint={t("shortcuts.holdHint")}
          value={config.shortcuts.hold}
          otherValue={config.shortcuts.toggle}
          onChange={setHold}
        />
        <ShortcutRecorder
          label={t("shortcuts.toggleMode")}
          hint={t("shortcuts.toggleHint")}
          value={config.shortcuts.toggle}
          otherValue={config.shortcuts.hold}
          onChange={setToggle}
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
