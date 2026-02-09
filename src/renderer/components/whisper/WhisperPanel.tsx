import { useState, useEffect } from "react";
import { useConfigStore } from "../../stores/config-store";
import { useSaveToast } from "../../hooks/use-save-toast";
import { ModelRow } from "./ModelRow";
import { StatusBox } from "../ui/StatusBox";
import { RecordIcon } from "../ui/icons";
import { recordAudio } from "../../utils/record-audio";
import type { ModelInfo } from "../../../preload/index";
import type { WhisperModelSize } from "../../../shared/config";
import card from "../shared/card.module.scss";
import btn from "../shared/buttons.module.scss";
import form from "../shared/forms.module.scss";

export function WhisperPanel() {
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const saveConfig = useConfigStore((s) => s.saveConfig);
  const loadConfig = useConfigStore((s) => s.loadConfig);
  const setupComplete = useConfigStore((s) => s.setupComplete);
  const triggerToast = useSaveToast((s) => s.trigger);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<{ text: string; type: "info" | "success" | "error" }>({ text: "", type: "info" });

  const refreshModels = () => {
    window.voxApi.models.list().then(setModels);
  };

  useEffect(() => {
    refreshModels();
  }, []);

  useEffect(() => {
    const cleanup = window.voxApi.models.onDownloadProgress((progress) => {
      // When download completes (100%), refresh models and config
      if (progress.downloaded === progress.total && progress.total > 0) {
        setTimeout(() => {
          refreshModels();
          loadConfig();
        }, 100);
      }
    });
    return cleanup;
  }, [loadConfig]);

  if (!config) return null;

  const handleSelect = async (size: string) => {
    // Only allow selection of downloaded models
    const selectedModel = models.find((m) => m.size === size);
    if (!selectedModel?.downloaded) {
      return;
    }

    // Update config and save
    updateConfig({ whisper: { model: size as WhisperModelSize } });
    await saveConfig(false);
    triggerToast();
  };

  const handleTest = async () => {
    setTesting(true);
    setTestStatus({ text: "Recording for 5 seconds...", type: "info" });
    await saveConfig();

    try {
      const recording = await recordAudio(5);
      setTestStatus({ text: "Transcribing...", type: "info" });
      const text = await window.voxApi.whisper.test(recording);
      setTestStatus({
        text: text || "(no speech detected)",
        type: text ? "success" : "info",
      });
    } catch (err: unknown) {
      setTestStatus({ text: `Test failed: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className={card.card}>
      <div className={card.header}>
        <h2>Whisper Model</h2>
        <p className={card.description}>Select the local speech recognition model. Larger models are more accurate but slower.</p>
      </div>
      {!setupComplete && (
        <div className={card.warningBanner}>
          Setup incomplete - Download a Whisper model to continue
        </div>
      )}
      <div className={card.body}>
        <div>
          {models.map((model) => (
            <ModelRow
              key={model.size}
              model={model}
              selected={model.size === config.whisper.model}
              onSelect={handleSelect}
            />
          ))}
        </div>

        <div className={form.testSection}>
          <button
            onClick={handleTest}
            disabled={testing}
            className={`${btn.btn} ${btn.primary}`}
          >
            <RecordIcon />
            Test Whisper
          </button>
          <p className={form.hint}>Records 5 seconds of audio and runs it through the selected model.</p>
          <StatusBox text={testStatus.text} type={testStatus.type} />
        </div>
      </div>
    </div>
  );
}
