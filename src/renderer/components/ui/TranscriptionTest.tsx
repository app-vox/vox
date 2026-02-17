import { useT } from "../../i18n-context";
import { StatusBox } from "./StatusBox";
import { RecordIcon } from "../../../shared/icons";
import type { TranscribeResult } from "../../../preload/index";
import styles from "./TranscriptionTest.module.scss";
import btn from "../shared/buttons.module.scss";

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

  let statusText = "";
  let statusType: "info" | "success" | "error" = "info";

  if (testing) {
    statusText = t("whisper.recording");
    statusType = "info";
  } else if (error) {
    if (error === "no-speech") {
      statusText = t("whisper.noSpeech");
      statusType = "info";
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
    </div>
  );
}
