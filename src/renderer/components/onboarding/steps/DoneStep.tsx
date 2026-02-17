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
        <li>{t("onboarding.done.tipTranscriptions")}</li>
        <li>{t("onboarding.done.tipDictionary")}</li>
        <li>{t("onboarding.done.tipAi")}</li>
      </ul>

      <a
        className={styles.skipLink}
        href="https://app-vox.github.io/vox/"
        target="_blank"
        rel="noopener noreferrer"
      >
        {t("onboarding.done.visitWebsite")}
      </a>

      <div className={styles.doneButtonRow}>
        <button className={`${btn.btn} ${btn.primary} ${styles.ctaButton}`} onClick={onComplete}>
          {t("onboarding.done.startUsing")}
        </button>
        <button className={`${btn.btn} ${btn.secondary} ${styles.ctaButton}`} onClick={onExploreSettings}>
          {t("onboarding.done.exploreSettings")}
        </button>
      </div>
    </div>
  );
}
