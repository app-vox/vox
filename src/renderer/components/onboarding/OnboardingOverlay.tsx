import { useCallback, useEffect, type JSX } from "react";
import { useConfigStore } from "../../stores/config-store";
import { useOnboardingStore, type OnboardingStep } from "./use-onboarding-store";
import { useT } from "../../i18n-context";
import { WelcomeStep } from "./steps/WelcomeStep";
import { ModelDownloadStep } from "./steps/ModelDownloadStep";
import { PermissionsStep } from "./steps/PermissionsStep";
import { ShortcutLearnStep } from "./steps/ShortcutLearnStep";
import { TryItStep } from "./steps/TryItStep";
import { DoneStep } from "./steps/DoneStep";
import styles from "./OnboardingOverlay.module.scss";

const TOTAL_STEPS = 6;

export function OnboardingOverlay() {
  const t = useT();
  const step = useOnboardingStore((s) => s.step);
  const back = useOnboardingStore((s) => s.back);
  const reset = useOnboardingStore((s) => s.reset);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const saveConfig = useConfigStore((s) => s.saveConfig);
  const setActiveTab = useConfigStore((s) => s.setActiveTab);

  const completeOnboarding = useCallback(async () => {
    updateConfig({ onboardingCompleted: true });
    await saveConfig(false);
    reset();
  }, [updateConfig, saveConfig, reset]);

  const handleSkip = useCallback(async () => {
    await completeOnboarding();
  }, [completeOnboarding]);

  const handleComplete = useCallback(async () => {
    await completeOnboarding();
    setActiveTab("transcriptions");
  }, [completeOnboarding, setActiveTab]);

  const handleExploreSettings = useCallback(async () => {
    await completeOnboarding();
    setActiveTab("general");
  }, [completeOnboarding, setActiveTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleSkip();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSkip]);

  const steps: Record<OnboardingStep, JSX.Element> = {
    0: <WelcomeStep />,
    1: <ModelDownloadStep />,
    2: <PermissionsStep />,
    3: <ShortcutLearnStep />,
    4: <TryItStep />,
    5: <DoneStep onComplete={handleComplete} onExploreSettings={handleExploreSettings} />,
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        {step > 0 && step < 5 && (
          <div className={styles.topNav}>
            <button className={styles.backBtn} onClick={back}>
              {t("onboarding.navigation.back")}
            </button>
            <button className={styles.skipBtn} onClick={handleSkip}>
              {t("onboarding.navigation.skip")}
            </button>
          </div>
        )}
        {step === 0 && (
          <div className={styles.topNav}>
            <span />
            <button className={styles.skipBtn} onClick={handleSkip}>
              {t("onboarding.navigation.skip")}
            </button>
          </div>
        )}

        <div className={styles.stepContainer}>
          {steps[step]}
        </div>

        <div className={styles.dots}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <span
              key={i}
              className={`${styles.dot} ${i === step ? styles.dotActive : ""} ${i < step ? styles.dotCompleted : ""}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
