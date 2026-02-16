import { useT } from "../../../i18n-context";
import { useOnboardingStore } from "../use-onboarding-store";
import { useConfigStore } from "../../../stores/config-store";
import styles from "../OnboardingOverlay.module.scss";
import btn from "../../shared/buttons.module.scss";

export function ShortcutLearnStep() {
  const t = useT();
  const next = useOnboardingStore((s) => s.next);
  const config = useConfigStore((s) => s.config);

  const holdShortcut = config?.shortcuts.hold || "Alt+Space";

  return (
    <div className={styles.stepContent}>
      <h2 className={styles.stepTitle}>
        {t("onboarding.shortcut.stepLabel", { current: "3", total: "4" })}
        {" — "}
        {t("onboarding.shortcut.title")}
      </h2>

      <div className={styles.shortcutDemo}>
        <p className={styles.holdInstruction}>
          {t("onboarding.shortcut.holdInstruction", { shortcut: holdShortcut })}
        </p>
        <div className={styles.shortcutKeys}>
          {holdShortcut.split("+").map((key) => (
            <kbd key={key} className={styles.key}>{key}</kbd>
          ))}
        </div>
        <p className={styles.releaseInstruction}>
          {t("onboarding.shortcut.releaseInstruction")}
        </p>
      </div>

      <p className={styles.hint}>{t("onboarding.shortcut.customizeHint")}</p>

      <button className={`${btn.btn} ${btn.primary} ${styles.ctaButton}`} onClick={next}>
        {t("onboarding.shortcut.tryItNow")}
      </button>
    </div>
  );
}
