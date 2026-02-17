import { useT } from "../../../i18n-context";
import { useOnboardingStore } from "../use-onboarding-store";
import styles from "../OnboardingOverlay.module.scss";
import btn from "../../shared/buttons.module.scss";

interface LlmIntroStepProps {
  onNavigateToLlm: () => void;
}

export function LlmIntroStep({ onNavigateToLlm }: LlmIntroStepProps) {
  const t = useT();
  const next = useOnboardingStore((s) => s.next);

  return (
    <div className={styles.stepContent}>
      <h2 className={styles.stepTitle}>
        {t("onboarding.llm.stepLabel", { current: "6", total: "8" })}
        {" — "}
        {t("onboarding.llm.title")}
      </h2>

      <p className={styles.description}>{t("onboarding.llm.description")}</p>
      <p className={styles.hint}>{t("onboarding.llm.optional")}</p>

      <div className={styles.buttonRow}>
        <button
          className={`${btn.btn} ${btn.primary} ${styles.ctaButton}`}
          onClick={next}
        >
          {t("onboarding.navigation.continue")}
        </button>
        <button className={styles.skipLink} onClick={onNavigateToLlm}>
          {t("onboarding.llm.goToSettings")}
        </button>
      </div>
    </div>
  );
}
