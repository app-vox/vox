import { useConfigStore } from "../../stores/config-store";
import { useSaveToast } from "../../hooks/use-save-toast";
import { useOnlineStatus } from "../../hooks/use-online-status";
import { useModelManager } from "../../hooks/use-model-manager";
import { useTranscriptionTest } from "../../hooks/use-transcription-test";
import { useDevOverrideValue } from "../../hooks/use-dev-override";
import { useT } from "../../i18n-context";
import { ModelSelector } from "../ui/ModelSelector";
import { TranscriptionTest } from "../ui/TranscriptionTest";
import { useState } from "react";
import { OfflineBanner } from "../ui/OfflineBanner";
import { AlertTriangleIcon } from "../../../shared/icons";
import card from "../shared/card.module.scss";
import form from "../shared/forms.module.scss";

export function WhisperPanel() {
  const t = useT();
  const online = useOnlineStatus();
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const saveConfig = useConfigStore((s) => s.saveConfig);
  const realSetupComplete = useConfigStore((s) => s.setupComplete);
  const triggerToast = useSaveToast((s) => s.trigger);

  const setupComplete = import.meta.env.DEV
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useDevOverrideValue("setupComplete", realSetupComplete)
    : realSetupComplete;

  const modelManager = useModelManager();
  const transcriptionTest = useTranscriptionTest(5);
  const [retentionDraft, setRetentionDraft] = useState<string | null>(null);

  if (!config) return null;

  const handleSelect = async (size: string) => {
    await modelManager.select(size);
    triggerToast();
  };

  return (
    <>
      <div className={card.card}>
        <div className={card.header}>
          <h2>{t("whisper.title")} <span className={card.titleSuffix}>{t("whisper.titleSuffix")}</span></h2>
          <p className={card.description}>{t("whisper.description")}</p>
        </div>
        {!setupComplete && (
          <div className={card.warningBanner}>
            <AlertTriangleIcon width={14} height={14} />
            {t("whisper.downloadPrompt")}
          </div>
        )}
        <div className={card.body}>
          <OfflineBanner />
          <ModelSelector
            models={setupComplete === false ? modelManager.models.map((m) => ({ ...m, downloaded: false })) : modelManager.models}
            selectedSize={setupComplete === false ? "" : modelManager.selectedSize}
            downloading={modelManager.downloading}
            progress={modelManager.progress}
            onSelect={handleSelect}
            onDownload={modelManager.download}
            onCancel={modelManager.cancelDownload}
            onDelete={modelManager.deleteModel}
            downloadDisabled={!online}
            recommendedSize="small"
          />

          <div className={form.testSection}>
            <TranscriptionTest
              testing={transcriptionTest.testing}
              result={transcriptionTest.result}
              error={transcriptionTest.error}
              onTest={transcriptionTest.run}
              buttonText={t("whisper.testButton")}
            />
            <p className={form.hint}>{t("whisper.testHint")}</p>
          </div>
        </div>
      </div>

      <div className={card.card}>
        <div className={card.header}>
          <h2>{t("history.audioRetention")}</h2>
          <p className={card.description}>{t("history.audioRetentionDesc")}</p>
        </div>
        <div className={card.body}>
          <div className={form.field}>
            <input
              id="audio-retention-count"
              type="number"
              min={0}
              value={retentionDraft ?? String(config.audioRetentionCount ?? 5)}
              onChange={(e) => setRetentionDraft(e.target.value)}
              onBlur={async (e) => {
                const parsed = Math.max(0, Math.round(Number(e.target.value) || 0));
                setRetentionDraft(null);
                updateConfig({ audioRetentionCount: parsed });
                await saveConfig(false);
                triggerToast();
              }}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  (e.target as HTMLInputElement).blur();
                }
              }}
            />
            <p className={form.hint}>{t("history.audioRetentionHint")}</p>
          </div>
        </div>
      </div>
    </>
  );
}
