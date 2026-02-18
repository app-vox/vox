import { useState } from "react";
import { useT } from "../../../i18n-context";
import { useOnboardingStore } from "../use-onboarding-store";
import { useConfigStore } from "../../../stores/config-store";
import { MicSimpleIcon } from "../../../../shared/icons";
import { RadioGroup } from "../../ui/RadioGroup";
import styles from "../OnboardingOverlay.module.scss";
import btn from "../../shared/buttons.module.scss";

type HudChoice = "enable" | "later";

export function HudDemoStep() {
  const t = useT();
  const next = useOnboardingStore((s) => s.next);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const saveConfig = useConfigStore((s) => s.saveConfig);
  const [choice, setChoice] = useState<HudChoice>("enable");

  const config = useConfigStore((s) => s.config);

  const options = [
    {
      value: "enable",
      label: t("onboarding.hud.choice.enable"),
      description: t("onboarding.hud.choice.enableDesc"),
      recommended: true,
    },
    {
      value: "later",
      label: t("onboarding.hud.choice.later"),
      description: t("onboarding.hud.choice.laterDesc"),
    },
  ];

  const handleContinue = async () => {
    if (choice === "enable") {
      updateConfig({ showHud: true, showHudActions: true });
      await saveConfig(false);
    } else if (choice === "later" && config?.showHud !== true) {
      updateConfig({ showHud: false });
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

      <div className={styles.hudPreview}>
        <span className={styles.hudPreviewLabel}>
          {t("onboarding.hud.previewLabel")}
        </span>
        <div className={styles.hudPreviewScene}>
          <div className={styles.hudPreviewButton}>
            <MicSimpleIcon width={20} height={20} />
          </div>
          <svg className={styles.hudPreviewCursor} width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M5 3l14 8-6.5 1.5L11 19z" fill="var(--color-text-tertiary)" stroke="var(--color-text-primary)" strokeWidth="1.5"/>
          </svg>
        </div>
      </div>

      <RadioGroup
        name="hud-choice"
        value={choice}
        options={options}
        onChange={(v) => setChoice(v as HudChoice)}
        recommendedLabel={t("onboarding.model.recommended")}
      />

      <div className={styles.hudButtonRow}>
        <button
          className={`${btn.btn} ${btn.primary} ${styles.ctaButton}`}
          onClick={handleContinue}
        >
          {t("onboarding.navigation.continue")}
        </button>
        <button
          className={`${btn.btn} ${btn.secondary}`}
          onClick={() => next()}
        >
          {t("onboarding.hud.choice.skip")}
        </button>
      </div>
    </div>
  );
}
