import { useRef, useEffect, useMemo } from "react";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const suggestedPhrase = useMemo(() => {
    const phrases = [
      t("onboarding.tryIt.suggestedPhrase1"),
      t("onboarding.tryIt.suggestedPhrase2"),
      t("onboarding.tryIt.suggestedPhrase3"),
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTest = async () => {
    textareaRef.current?.focus();
    setTesting(true);
    setTestResult(null);
    setTestError(null);

    try {
      const recording = await recordAudio(3);
      const text = await window.voxApi.whisper.test(recording);
      if (text) {
        setTestResult(text);
        await window.voxApi.history.add({
          text,
          originalText: text,
          audioDurationMs: 3000,
          whisperModel: config?.whisper?.model || "small",
          llmEnhanced: false,
        });
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
        {t("onboarding.tryIt.stepLabel", { current: "4", total: "8" })}
        {" — "}
        {t("onboarding.tryIt.title")}
      </h2>

      <p className={styles.description}>
        {t("onboarding.tryIt.instruction", { shortcut: holdShortcut })}
      </p>

      <p className={styles.hint}>
        {t("onboarding.tryIt.suggestedPhrasesLabel")} ({suggestedPhrase})
      </p>

      <div className={styles.testArea}>
        <textarea
          ref={textareaRef}
          className={styles.testResultBox}
          value={testResult || ""}
          readOnly
          rows={3}
          placeholder=""
        />

        {testResult && (
          <p className={styles.successMessage}>{t("onboarding.tryIt.success")}</p>
        )}
        {testError === "no-speech" && (
          <p className={styles.errorMessage}>{t("onboarding.tryIt.noSpeech")}</p>
        )}
        {testError && testError !== "no-speech" && (
          <p className={styles.errorMessage}>{t("onboarding.tryIt.failed", { error: testError })}</p>
        )}
        {statusMessage && <p className={styles.statusMessage}>{statusMessage}</p>}
      </div>

      {!testResult && (
        <p className={styles.hint}>{t("onboarding.tryIt.orPressButton")}</p>
      )}

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
            {t("onboarding.navigation.continue")}
          </button>
        )}
      </div>
    </div>
  );
}
