import { useState } from "react";
import { useT } from "../../../i18n-context";
import { useOnboardingStore } from "../use-onboarding-store";
import { useConfigStore } from "../../../stores/config-store";
import styles from "../OnboardingOverlay.module.scss";
import btn from "../../shared/buttons.module.scss";

type HudChoice = "enable" | "later" | "skip";

export function HudDemoStep() {
  const t = useT();
  const next = useOnboardingStore((s) => s.next);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const saveConfig = useConfigStore((s) => s.saveConfig);
  const [choice, setChoice] = useState<HudChoice>("enable");

  const handleContinue = async () => {
    if (choice === "enable") {
      updateConfig({ showHud: true, showHudActions: true });
      await saveConfig(false);
    }
    next();
  };

  return (
    <div className={styles.stepContent}>
      <h2 className={styles.stepTitle}>
        {t("onboarding.hud.stepLabel", { current: "5", total: "8" })}
        {" — "}
        {t("onboarding.hud.title")}
      </h2>
      <p className={styles.description}>{t("onboarding.hud.description")}</p>

      <div className={styles.modelList}>
        {(["enable", "later", "skip"] as const).map((opt) => (
          <label
            key={opt}
            className={`${styles.modelRow} ${choice === opt ? styles.modelRowSelected : ""}`}
          >
            <input
              type="radio"
              name="hud-choice"
              checked={choice === opt}
              onChange={() => setChoice(opt)}
            />
            <div className={styles.modelInfo}>
              <span className={styles.modelName}>
                {t(`onboarding.hud.choice.${opt}`)}
                {opt === "enable" && (
                  <span className={styles.recommendedBadge}>{t("onboarding.model.recommended")}</span>
                )}
              </span>
              <span className={styles.modelDesc}>{t(`onboarding.hud.choice.${opt}Desc`)}</span>
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
