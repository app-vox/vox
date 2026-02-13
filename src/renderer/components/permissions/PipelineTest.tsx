import { useState } from "react";
import { recordAudio } from "../../utils/record-audio";
import { useT } from "../../i18n-context";
import { StatusBox } from "../ui/StatusBox";
import { RecordIcon } from "../ui/icons";
import card from "../shared/card.module.scss";
import btn from "../shared/buttons.module.scss";

export function PipelineTest() {
  const t = useT();
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<{ text: string; type: "info" | "success" | "error" }>({ text: "", type: "info" });

  const handleTest = async () => {
    setTesting(true);
    setTestStatus({ text: t("permissions.pipeline.recording"), type: "info" });

    try {
      const recording = await recordAudio(5);
      setTestStatus({ text: t("permissions.pipeline.transcribing"), type: "info" });
      const result = await window.voxApi.pipeline.testTranscribe(recording);

      let output = t("permissions.pipeline.localModel", { text: result.rawText || t("permissions.pipeline.empty") });
      if (result.correctedText) {
        output += "\n" + t("permissions.pipeline.llmResult", { text: result.correctedText });
        setTestStatus({ text: output, type: "success" });
      } else if (result.llmError) {
        output += "\n" + t("permissions.pipeline.llmError", { error: result.llmError });
        setTestStatus({ text: output, type: "error" });
      } else {
        setTestStatus({ text: output, type: "success" });
      }
    } catch (err: unknown) {
      setTestStatus({ text: t("permissions.pipeline.testFailed", { error: err instanceof Error ? err.message : String(err) }), type: "error" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <div className={card.header}>
        <h2>{t("permissions.pipeline.title")}</h2>
        <p className={card.description}>{t("permissions.pipeline.description")}</p>
      </div>
      <div className={card.body}>
        <button
          onClick={handleTest}
          disabled={testing}
          className={`${btn.btn} ${btn.primary}`}
        >
          <RecordIcon />
          {t("permissions.pipeline.testButton")}
        </button>
        <StatusBox text={testStatus.text} type={testStatus.type} />
      </div>
    </>
  );
}
