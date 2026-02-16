import { useT } from "../../../i18n-context";
import { useOnboardingStore } from "../use-onboarding-store";
import { useConfigStore } from "../../../stores/config-store";
import { recordAudio } from "../../../utils/record-audio";
import { RecordIcon } from "../../../../shared/icons";
import styles from "../OnboardingOverlay.module.scss";
import btn from "../../shared/buttons.module.scss";

export function TryItStep() {
  const t = useT();
  const next = useOnboardingStore((s) => s.next);
  const testing = useOnboardingStore((s) => s.testing);
  const testResult = useOnboardingStore((s) => s.testResult);
  const testError = useOnboardingStore((s) => s.testError);
  const setTesting = useOnboardingStore((s) => s.setTesting);
  const setTestResult = useOnboardingStore((s) => s.setTestResult);
  const setTestError = useOnboardingStore((s) => s.setTestError);
  const config = useConfigStore((s) => s.config);

  const holdShortcut = config?.shortcuts.hold || "Alt+Space";

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setTestError(null);

    try {
      const recording = await recordAudio(5);
      const text = await window.voxApi.whisper.test(recording);
      if (text) {
        setTestResult(text);
        await window.voxApi.clipboard.write(text);
      } else {
        setTestResult(null);
        setTestError("no-speech");
      }
    } catch (err: unknown) {
      setTestError(err instanceof Error ? err.message : String(err));
    } finally {
      setTesting(false);
    }
  };

  const statusMessage = testing
    ? t("onboarding.tryIt.recording")
    : null;

  return (
    <div className={styles.stepContent}>
      <h2 className={styles.stepTitle}>
        {t("onboarding.tryIt.stepLabel", { current: "4", total: "4" })}
        {" — "}
        {t("onboarding.tryIt.title")}
      </h2>

      <p className={styles.description}>
        {t("onboarding.tryIt.instruction", { shortcut: holdShortcut })}
      </p>

      <div className={styles.testArea}>
        {testResult && (
          <>
            <div className={styles.testResultBox}>{testResult}</div>
            <p className={styles.successMessage}>{t("onboarding.tryIt.success")}</p>
          </>
        )}
        {testError === "no-speech" && (
          <p className={styles.errorMessage}>{t("onboarding.tryIt.noSpeech")}</p>
        )}
        {testError && testError !== "no-speech" && (
          <p className={styles.errorMessage}>{t("onboarding.tryIt.failed", { error: testError })}</p>
        )}
        {statusMessage && <p className={styles.statusMessage}>{statusMessage}</p>}
      </div>

      <div className={styles.buttonRow}>
        {!testResult ? (
          <>
            <button
              className={`${btn.btn} ${btn.primary} ${styles.ctaButton}`}
              onClick={handleTest}
              disabled={testing}
            >
              <RecordIcon width={16} height={16} />
              {testError ? t("onboarding.tryIt.retry") : t("onboarding.tryIt.title")}
            </button>
            <button className={styles.skipLink} onClick={next}>
              {t("onboarding.tryIt.skip")}
            </button>
          </>
        ) : (
          <button className={`${btn.btn} ${btn.primary} ${styles.ctaButton}`} onClick={next}>
            {t("onboarding.tryIt.finishSetup")}
          </button>
        )}
      </div>
    </div>
  );
}
