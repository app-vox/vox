import { useT } from "../../../i18n-context";
import { useConfigStore } from "../../../stores/config-store";
import styles from "../OnboardingOverlay.module.scss";
import btn from "../../shared/buttons.module.scss";

interface DoneStepProps {
  onComplete: () => void;
  onExploreSettings: () => void;
}

export function DoneStep({ onComplete, onExploreSettings }: DoneStepProps) {
  const t = useT();
  const config = useConfigStore((s) => s.config);
  const holdShortcut = config?.shortcuts.hold || "Alt+Space";

  return (
    <div className={styles.stepContent}>
      <h1 className={styles.title}>{t("onboarding.done.title")}</h1>
      <p className={styles.subtitle}>{t("onboarding.done.subtitle")}</p>

      <ul className={styles.tipList}>
        <li>{t("onboarding.done.tip1", { shortcut: holdShortcut })}</li>
        <li>{t("onboarding.done.tip2")}</li>
        <li>{t("onboarding.done.tip3")}</li>
      </ul>

      <p className={styles.hint}>{t("onboarding.done.aiHint")}</p>

      <div className={styles.buttonRow}>
        <button className={`${btn.btn} ${btn.primary} ${styles.ctaButton}`} onClick={onComplete}>
          {t("onboarding.done.startUsing")}
        </button>
        <button className={`${btn.btn} ${btn.secondary}`} onClick={onExploreSettings}>
          {t("onboarding.done.exploreSettings")}
        </button>
      </div>
    </div>
  );
}
