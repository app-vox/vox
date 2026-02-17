import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import { useConfigStore } from "../../stores/config-store";
import { useOnboardingStore, type OnboardingStep } from "./use-onboarding-store";
import { useT } from "../../i18n-context";
import { WelcomeStep } from "./steps/WelcomeStep";
import { ModelDownloadStep } from "./steps/ModelDownloadStep";
import { PermissionsStep } from "./steps/PermissionsStep";
import { ShortcutLearnStep } from "./steps/ShortcutLearnStep";
import { TryItStep } from "./steps/TryItStep";
import { HudDemoStep } from "./steps/HudDemoStep";
import { LlmIntroStep } from "./steps/LlmIntroStep";
import { DoneStep } from "./steps/DoneStep";
import { XIcon } from "../../../shared/icons";
import styles from "./OnboardingOverlay.module.scss";

const TOTAL_STEPS = 8;
const CLOSE_ANIMATION_MS = 500;

export function OnboardingOverlay() {
  const t = useT();
  const step = useOnboardingStore((s) => s.step);
  const back = useOnboardingStore((s) => s.back);
  const reset = useOnboardingStore((s) => s.reset);
  const setForceOpen = useOnboardingStore((s) => s.setForceOpen);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const saveConfig = useConfigStore((s) => s.saveConfig);
  const setActiveTab = useConfigStore((s) => s.setActiveTab);
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);

  const completeOnboarding = useCallback(async () => {
    setForceOpen(false);
    updateConfig({ onboardingCompleted: true });
    await saveConfig(false);
    reset();
  }, [setForceOpen, updateConfig, saveConfig, reset]);

  const animateClose = useCallback(
    (afterClose: () => Promise<void> | void) => {
      if (closingRef.current) return;
      closingRef.current = true;
      setClosing(true);
      setActiveTab("general");
      setTimeout(async () => {
        await completeOnboarding();
        afterClose();
      }, CLOSE_ANIMATION_MS);
    },
    [completeOnboarding, setActiveTab],
  );

  const handleSkip = useCallback(() => {
    animateClose(() => {});
  }, [animateClose]);

  const handleComplete = useCallback(() => {
    animateClose(() => setActiveTab("transcriptions"));
  }, [animateClose, setActiveTab]);

  const handleExploreSettings = useCallback(() => {
    animateClose(() => setActiveTab("general"));
  }, [animateClose, setActiveTab]);

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
    5: <HudDemoStep />,
    6: <LlmIntroStep />,
    7: <DoneStep onComplete={handleComplete} onExploreSettings={handleExploreSettings} />,
  };

  return (
    <div className={`${styles.overlay} ${closing ? styles.overlayClosing : ""}`}>
      <button className={styles.closeBtn} onClick={handleSkip} aria-label="Close" type="button">
        <XIcon width={18} height={18} />
      </button>
      <div className={styles.container}>
        {step > 0 && step < 7 && (
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
