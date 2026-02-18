import { useRef, useEffect, useCallback } from "react";
import { useT } from "../../../i18n-context";
import { useOnboardingStore } from "../use-onboarding-store";
import { useConfigStore } from "../../../stores/config-store";
import { useWhisperTest } from "../../../hooks/use-whisper-test";
import { RecordIcon } from "../../../../shared/icons";
import styles from "../OnboardingOverlay.module.scss";
import btn from "../../shared/buttons.module.scss";

const PHRASE_KEYS = [
  "onboarding.tryIt.suggestedPhrase1",
  "onboarding.tryIt.suggestedPhrase2",
  "onboarding.tryIt.suggestedPhrase3",
] as const;

const randomPhraseIndex = Math.floor(Math.random() * PHRASE_KEYS.length);

export function TryItStep() {
  const t = useT();
  const next = useOnboardingStore((s) => s.next);
  const config = useConfigStore((s) => s.config);

  const holdShortcut = config?.shortcuts.hold || "Alt+Space";
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const onSuccess = useCallback(async (text: string) => {
    await window.voxApi.history.add({
      text,
      originalText: text,
      audioDurationMs: 3000,
      whisperModel: config?.whisper?.model || "small",
      llmEnhanced: false,
    });
  }, [config?.whisper?.model]);

  const { testing, testResult, testError, runTest, setTestResult } = useWhisperTest({ onSuccess });

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const suggestedPhrase = t(PHRASE_KEYS[randomPhraseIndex]);

  const handleTest = async () => {
    textareaRef.current?.focus();
    await runTest(3);
  };

  const statusMessage = testing
    ? t("onboarding.tryIt.recording")
    : null;

  const handleStepClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName !== "BUTTON") {
      textareaRef.current?.focus();
    }
  };

  return (
    <div className={styles.stepContent} onClick={handleStepClick}>
      <h2 className={styles.stepTitle}>
        {t("onboarding.tryIt.stepLabel", { current: "4", total: "8" })}
        {" — "}
        {t("onboarding.tryIt.title")}
      </h2>

      <p className={styles.description}>
        {t("onboarding.tryIt.instruction", { shortcut: holdShortcut })}
      </p>

      <p className={styles.hint}>
        {t("onboarding.tryIt.suggestedPhrasesLabel", { phrase: suggestedPhrase })}
      </p>

      <div className={styles.testArea}>
        <textarea
          ref={textareaRef}
          className={styles.testResultBox}
          value={testResult || ""}
          rows={3}
          onKeyDown={(e) => {
            const isPaste = (e.metaKey || e.ctrlKey) && e.key === "v";
            const isSelect = (e.metaKey || e.ctrlKey) && e.key === "a";
            const isCopy = (e.metaKey || e.ctrlKey) && e.key === "c";
            if (!isPaste && !isSelect && !isCopy) {
              e.preventDefault();
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            const text = e.clipboardData.getData("text/plain");
            if (text) setTestResult(text);
          }}
          onChange={() => {}}
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
