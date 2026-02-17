import { useConfigStore } from "../../stores/config-store";
import { useSaveToast } from "../../hooks/use-save-toast";
import { useOnlineStatus } from "../../hooks/use-online-status";
import { useModelManager } from "../../hooks/use-model-manager";
import { useTranscriptionTest } from "../../hooks/use-transcription-test";
import { useDevOverrideValue } from "../../hooks/use-dev-override";
import { useT } from "../../i18n-context";
import { ModelSelector } from "../ui/ModelSelector";
import { TranscriptionTest } from "../ui/TranscriptionTest";
import { OfflineBanner } from "../ui/OfflineBanner";
import { AlertTriangleIcon } from "../../../shared/icons";
import card from "../shared/card.module.scss";
import form from "../shared/forms.module.scss";

export function WhisperPanel() {
  const t = useT();
  const online = useOnlineStatus();
  const config = useConfigStore((s) => s.config);
  const realSetupComplete = useConfigStore((s) => s.setupComplete);
  const triggerToast = useSaveToast((s) => s.trigger);

  const setupComplete = import.meta.env.DEV
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useDevOverrideValue("setupComplete", realSetupComplete)
    : realSetupComplete;

  const modelManager = useModelManager();
  const transcriptionTest = useTranscriptionTest(5);

  if (!config) return null;

  const handleSelect = async (size: string) => {
    await modelManager.select(size);
    triggerToast();
  };

  return (
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
          models={modelManager.models}
          selectedSize={modelManager.selectedSize}
          downloading={modelManager.downloading}
          progress={modelManager.progress}
          onSelect={handleSelect}
          onDownload={modelManager.download}
          onCancel={modelManager.cancelDownload}
          onDelete={modelManager.deleteModel}
          downloadDisabled={!online}
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
  );
}
