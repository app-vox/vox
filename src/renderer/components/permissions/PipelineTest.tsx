import { useState } from "react";
import { recordAudio } from "../../utils/record-audio";
import { StatusBox } from "../ui/StatusBox";
import { RecordIcon } from "../ui/icons";

export function PipelineTest() {
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState({ text: "", type: "info" as const });

  const handleTest = async () => {
    setTesting(true);
    setTestStatus({ text: "Recording for 5 seconds...", type: "info" });

    try {
      const recording = await recordAudio(5);
      setTestStatus({ text: "Transcribing...", type: "info" });
      const result = await window.voxApi.pipeline.testTranscribe(recording);

      let output = `Whisper: ${result.rawText || "(empty)"}`;
      if (result.correctedText) {
        output += `\nLLM:     ${result.correctedText}`;
        setTestStatus({ text: output, type: "success" });
      } else if (result.llmError) {
        output += `\nLLM error: ${result.llmError}`;
        setTestStatus({ text: output, type: "error" });
      } else {
        setTestStatus({ text: output, type: "success" });
      }
    } catch (err: any) {
      setTestStatus({ text: `Test failed: ${err.message}`, type: "error" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <div className="card-header">
        <h2>Pipeline Test</h2>
        <p className="card-description">Record a 5-second audio sample to test transcription and LLM correction.</p>
      </div>
      <div className="card-body">
        <button
          onClick={handleTest}
          disabled={testing}
          className="btn btn-primary"
        >
          <RecordIcon />
          Record 5s Test
        </button>
        <StatusBox text={testStatus.text} type={testStatus.type} />
      </div>
    </>
  );
}
