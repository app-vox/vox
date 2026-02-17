import { useRef, useEffect, useMemo } from "react";
import { useT } from "../../../i18n-context";
import { useOnboardingStore } from "../use-onboarding-store";
import { useConfigStore } from "../../../stores/config-store";
import { useTranscriptionTest } from "../../../hooks/use-transcription-test";
import styles from "../OnboardingOverlay.module.scss";
import btn from "../../shared/buttons.module.scss";

export function TryItStep() {
  const t = useT();
  const next = useOnboardingStore((s) => s.next);
  const config = useConfigStore((s) => s.config);
  const transcriptionTest = useTranscriptionTest(3);

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
    const result = await transcriptionTest.run();

    // Save to history on success
    if (result?.rawText) {
      const text = result.correctedText || result.rawText;
      await window.voxApi.history.add({
        text,
        originalText: result.rawText,
        audioDurationMs: 3000,
        whisperModel: config?.whisper?.model || "small",
        llmEnhanced: !!result.correctedText,
      });
    }
  };

  const resultText = transcriptionTest.result
    ? transcriptionTest.result.correctedText || transcriptionTest.result.rawText
    : "";

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
          value={resultText}
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
          }}
          onChange={() => {}}
        />

        {resultText && (
          <p className={styles.successMessage}>{t("onboarding.tryIt.success")}</p>
        )}
        {transcriptionTest.error === "no-speech" && (
          <p className={styles.errorMessage}>{t("onboarding.tryIt.noSpeech")}</p>
        )}
        {transcriptionTest.error && transcriptionTest.error !== "no-speech" && (
          <p className={styles.errorMessage}>{t("onboarding.tryIt.failed", { error: transcriptionTest.error })}</p>
        )}
        {transcriptionTest.testing && <p className={styles.statusMessage}>{t("onboarding.tryIt.recording")}</p>}
      </div>

      {!resultText && (
        <p className={styles.hint}>{t("onboarding.tryIt.orPressButton")}</p>
      )}

      <div className={styles.buttonRow}>
        {!resultText ? (
          <>
            <button
              className={`${btn.btn} ${btn.primary} ${styles.ctaButton}`}
              onClick={handleTest}
              disabled={transcriptionTest.testing}
            >
              {transcriptionTest.error ? t("onboarding.tryIt.retry") : t("onboarding.tryIt.title")}
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
