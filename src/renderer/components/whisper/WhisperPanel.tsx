import { useState, useEffect, useCallback } from "react";
import { useConfigStore } from "../../stores/config-store";
import { useSaveToast } from "../../hooks/use-save-toast";
import { useOnlineStatus } from "../../hooks/use-online-status";
import { useT } from "../../i18n-context";
import { ModelRow } from "./ModelRow";
import { StatusBox } from "../ui/StatusBox";
import { OfflineBanner } from "../ui/OfflineBanner";
import { RecordIcon, AlertTriangleIcon } from "../../../shared/icons";
import { recordAudio } from "../../utils/record-audio";
import type { ModelInfo } from "../../../preload/index";
import type { WhisperModelSize } from "../../../shared/config";
import card from "../shared/card.module.scss";
import btn from "../shared/buttons.module.scss";
import form from "../shared/forms.module.scss";

export function WhisperPanel() {
  const t = useT();
  const online = useOnlineStatus();
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const saveConfig = useConfigStore((s) => s.saveConfig);
  const loadConfig = useConfigStore((s) => s.loadConfig);
  const setupComplete = useConfigStore((s) => s.setupComplete);
  const triggerToast = useSaveToast((s) => s.trigger);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<{ text: string; type: "info" | "success" | "error" }>({ text: "", type: "info" });

  const refreshModels = useCallback(async () => {
    const modelsList = await window.voxApi.models.list();
    setModels(modelsList);

    const currentConfig = useConfigStore.getState().config;
    if (!currentConfig) return;

    const selectedModel = currentConfig.whisper.model;
    if (selectedModel) {
      const stillDownloaded = modelsList.find(
        (m) => m.size === selectedModel && m.downloaded
      );

      if (!stillDownloaded) {
        const firstAvailable = modelsList.find((m) => m.downloaded);

        if (firstAvailable) {
          updateConfig({ whisper: { model: firstAvailable.size as WhisperModelSize } });
          await saveConfig(false);
        } else {
          updateConfig({ whisper: { model: "" as WhisperModelSize } });
          await saveConfig(false);
        }
      }
    }
  }, [updateConfig, saveConfig]);

  useEffect(() => {
    refreshModels();
  }, [refreshModels]);

  useEffect(() => {
    const cleanup = window.voxApi.models.onDownloadProgress((progress) => {
      if (progress.downloaded === progress.total && progress.total > 0) {
        setTimeout(() => {
          refreshModels();
          loadConfig();
          useConfigStore.getState().checkSetup();
        }, 100);
      }
    });
    return cleanup;
  }, [loadConfig, refreshModels]);

  if (!config) return null;

  const handleSelect = async (size: string) => {
    const selectedModel = models.find((m) => m.size === size);
    if (!selectedModel?.downloaded) {
      return;
    }

    updateConfig({ whisper: { model: size as WhisperModelSize } });
    await saveConfig(false);
    triggerToast();
  };

  const handleTest = async () => {
    setTesting(true);
    setTestStatus({ text: t("whisper.recording"), type: "info" });
    await saveConfig();

    try {
      const recording = await recordAudio(5);
      setTestStatus({ text: t("whisper.transcribing"), type: "info" });
      const text = await window.voxApi.whisper.test(recording);
      setTestStatus({
        text: text || t("whisper.noSpeech"),
        type: text ? "success" : "info",
      });
    } catch (err: unknown) {
      setTestStatus({ text: t("whisper.testFailed", { error: err instanceof Error ? err.message : String(err) }), type: "error" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className={card.card}>
      <div className={card.header}>
        <h2>{t("whisper.title")} <span className={card.titleSuffix}>{t("whisper.titleSuffix")}</span></h2>
        <p className={card.description}>{t("whisper.description")}</p>
      </div>
      {!setupComplete && (
        <div className={card.warningBanner}>
          <AlertTriangleIcon width={14} height={14} style={{ marginRight: 6, flexShrink: 0 }} />
          {t("whisper.downloadPrompt")}
        </div>
      )}
      <div className={card.body}>
        <OfflineBanner />
        <div>
          {models.map((model) => (
            <ModelRow
              key={model.size}
              model={model}
              selected={model.size === config.whisper.model}
              onSelect={handleSelect}
              onDelete={refreshModels}
              downloadDisabled={!online}
            />
          ))}
        </div>

        <div className={form.testSection}>
          <button
            onClick={handleTest}
            disabled={testing || !models.some(m => m.downloaded)}
            className={`${btn.btn} ${btn.primary}`}
          >
            <RecordIcon width={16} height={16} />
            {t("whisper.testButton")}
          </button>
          <p className={form.hint}>{t("whisper.testHint")}</p>
          <StatusBox text={testStatus.text} type={testStatus.type} />
        </div>
      </div>
    </div>
  );
}
