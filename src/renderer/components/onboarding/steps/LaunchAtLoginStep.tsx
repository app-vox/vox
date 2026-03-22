import { useState } from "react";
import { useT } from "../../../i18n-context";
import { useOnboardingStore } from "../use-onboarding-store";
import { useConfigStore } from "../../../stores/config-store";
import { MonitorIcon } from "../../../../shared/icons";
import styles from "../OnboardingOverlay.module.scss";
import btn from "../../shared/buttons.module.scss";

export function LaunchAtLoginStep() {
  const t = useT();
  const next = useOnboardingStore((s) => s.next);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const saveConfig = useConfigStore((s) => s.saveConfig);
  const config = useConfigStore((s) => s.config);
  const [choice, setChoice] = useState<boolean>(config?.launchAtLogin ?? false);

  const handleContinue = async () => {
    updateConfig({ launchAtLogin: choice });
    await saveConfig(false);
    next();
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.heroIcon}>
        <MonitorIcon width={36} height={36} />
      </div>

      <h2 className={styles.stepTitle}>
        {t("onboarding.launchAtLogin.stepLabel", { current: "7", total: "9" })}
        {" — "}
        {t("onboarding.launchAtLogin.title")}
      </h2>

      <p className={styles.description}>{t("onboarding.launchAtLogin.description")}</p>

      <div className={styles.modelList}>
        {([true, false] as const).map((opt) => (
          <label
            key={String(opt)}
            className={`${styles.modelRow} ${choice === opt ? styles.modelRowSelected : ""}`}
          >
            <input
              type="radio"
              name="launch-at-login"
              checked={choice === opt}
              onChange={() => setChoice(opt)}
            />
            <div className={styles.modelInfo}>
              <span className={styles.modelName}>
                {t(opt ? "onboarding.launchAtLogin.choice.yes" : "onboarding.launchAtLogin.choice.no")}
              </span>
              <span className={styles.modelDesc}>
                {t(opt ? "onboarding.launchAtLogin.choice.yesDesc" : "onboarding.launchAtLogin.choice.noDesc")}
              </span>
            </div>
          </label>
        ))}
      </div>

      <button
        className={`${btn.btn} ${btn.primary} ${styles.ctaButton}`}
        onClick={handleContinue}
      >
        {t("onboarding.navigation.continue")}
      </button>
    </div>
  );
}
