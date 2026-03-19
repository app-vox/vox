import { useT, useLanguage } from "../../i18n-context";
import { StatusBox } from "./StatusBox";
import { RecordIcon, ExternalLinkIcon } from "../../../shared/icons";
import type { TranscribeResult } from "../../../preload/index";
import { getDocsUrl } from "../../../shared/i18n";
import styles from "./TranscriptionTest.module.scss";
import btn from "../shared/buttons.module.scss";
import card from "../shared/card.module.scss";

interface TranscriptionTestProps {
  testing: boolean;
  result: TranscribeResult | null;
  error: string | null;
  onTest: () => void;
  onReset?: () => void;
  buttonText: string;
  showLlmResult?: boolean;
  className?: string;
}

export function TranscriptionTest({
  testing,
  result,
  error,
  onTest,
  buttonText,
  showLlmResult,
  className,
}: TranscriptionTestProps) {
  const t = useT();
  const language = useLanguage();

  let statusText = "";
  let statusType: "info" | "success" | "error" = "info";
  const isOsIncompatible = error === "os-incompatible";

  if (testing) {
    statusText = t("whisper.recording");
    statusType = "info";
  } else if (error) {
    if (error === "no-speech") {
      statusText = t("whisper.noSpeech");
      statusType = "info";
    } else if (error === "os-incompatible") {
      statusText = t("whisper.osIncompatible");
      statusType = "error";
    } else {
      statusText = t("whisper.testFailed", { error });
      statusType = "error";
    }
  } else if (result) {
    if (showLlmResult) {
      statusText = `Local Model: ${result.rawText || "(empty)"}`;
      if (result.correctedText) {
        statusText += `\nLLM:     ${result.correctedText}`;
        statusType = "success";
      } else if (result.llmError) {
        statusText += `\nLLM error: ${result.llmError}`;
        statusType = "error";
      } else {
        statusType = "success";
      }
    } else {
      statusText = result.correctedText || result.rawText;
      statusType = "success";
    }
  }

  return (
    <div className={`${styles.container} ${className ?? ""}`}>
      <button
        onClick={onTest}
        disabled={testing}
        className={`${btn.btn} ${btn.primary}`}
      >
        <RecordIcon width={16} height={16} />
        {buttonText}
      </button>
      <StatusBox text={statusText} type={statusType} />
      {isOsIncompatible && (
        <button
          type="button"
          className={card.learnMore}
          onClick={() => window.voxApi.shell.openExternal(getDocsUrl(language, "speech-models#system-requirements"))}
        >
          {t("whisper.osIncompatibleLink")}
          <ExternalLinkIcon width={12} height={12} />
        </button>
      )}
    </div>
  );
}
