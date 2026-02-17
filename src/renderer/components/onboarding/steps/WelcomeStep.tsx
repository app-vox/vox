import { useT } from "../../../i18n-context";
import { MicIcon } from "../../../../shared/icons";
import { useOnboardingStore } from "../use-onboarding-store";
import styles from "../OnboardingOverlay.module.scss";
import btn from "../../shared/buttons.module.scss";

export function WelcomeStep() {
  const t = useT();
  const next = useOnboardingStore((s) => s.next);

  return (
    <div className={styles.stepContent}>
      <div className={styles.heroIcon}>
        <MicIcon width={48} height={48} />
      </div>
      <h1 className={styles.title}>{t("onboarding.welcome.title")}</h1>
      <p className={styles.subtitle}>{t("onboarding.welcome.subtitle")}</p>
      <p className={styles.description}>{t("onboarding.welcome.description")}</p>
      <button className={`${btn.btn} ${btn.primary} ${styles.ctaButton}`} onClick={next}>
        {t("onboarding.welcome.getStarted")}
      </button>
    </div>
  );
}
