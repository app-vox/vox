import { useState, useEffect, useCallback } from "react";
import { useT } from "../../../i18n-context";
import { useOnboardingStore } from "../use-onboarding-store";
import { useOnlineStatus } from "../../../hooks/use-online-status";
import { useConfigStore } from "../../../stores/config-store";
import { OfflineBanner } from "../../ui/OfflineBanner";
import { ModelRow } from "../../whisper/ModelRow";
import type { ModelInfo } from "../../../../preload/index";
import type { WhisperModelSize } from "../../../../shared/config";
import styles from "../OnboardingOverlay.module.scss";
import btn from "../../shared/buttons.module.scss";

const RECOMMENDED_MODEL = "small";

export function ModelDownloadStep() {
  const t = useT();
  const online = useOnlineStatus();
  const next = useOnboardingStore((s) => s.next);
  const modelDownloaded = useOnboardingStore((s) => s.modelDownloaded);
  const setModelDownloaded = useOnboardingStore((s) => s.setModelDownloaded);
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const saveConfig = useConfigStore((s) => s.saveConfig);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedSize, setSelectedSize] = useState<string>("");

  const refreshModels = useCallback(async () => {
    const list = await window.voxApi.models.list();
    setModels(list);
    const anyDownloaded = list.some((m) => m.downloaded);
    setModelDownloaded(anyDownloaded);

    if (anyDownloaded) {
      const configuredModel = config?.whisper.model;
      const configuredAndDownloaded = list.find(
        (m) => m.size === configuredModel && m.downloaded
      );

      if (configuredAndDownloaded) {
        setSelectedSize(configuredAndDownloaded.size);
      } else if (!selectedSize || !list.find((m) => m.size === selectedSize && m.downloaded)) {
        const first = list.find((m) => m.downloaded);
        if (first) setSelectedSize(first.size);
      }
    }
  }, [setModelDownloaded, selectedSize, config?.whisper.model]);

  useEffect(() => {
    refreshModels(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [refreshModels]);

  useEffect(() => {
    const cleanup = window.voxApi.models.onDownloadProgress((p) => {
      if (p.downloaded === p.total && p.total > 0) {
        setTimeout(() => refreshModels(), 100);
      }
    });
    return cleanup;
  }, [refreshModels]);

  const handleSelect = async (size: string) => {
    setSelectedSize(size);
    const model = models.find((m) => m.size === size);
    if (model?.downloaded) {
      updateConfig({ whisper: { model: size as WhisperModelSize } });
      await saveConfig(false);
    }
  };

  const handleContinue = () => {
    next();
  };

  return (
    <div className={styles.stepContent}>
      <h2 className={styles.stepTitle}>
        {t("onboarding.model.stepLabel", { current: "1", total: "8" })}
        {" — "}
        {t("onboarding.model.title")}
      </h2>
      <p className={styles.privacyNote}>{t("onboarding.model.privacyNote")}</p>

      <OfflineBanner />

      <div className={styles.modelRowList}>
        {models.map((model) => (
          <ModelRow
            key={model.size}
            model={model}
            selected={selectedSize === model.size}
            onSelect={handleSelect}
            onDelete={refreshModels}
            downloadDisabled={!online}
            compact
            recommended={model.size === RECOMMENDED_MODEL}
            recommendedLabel={t("onboarding.model.recommended")}
          />
        ))}
      </div>

      <button
        className={`${btn.btn} ${btn.primary} ${styles.ctaButton}`}
        onClick={handleContinue}
        disabled={!modelDownloaded || !selectedSize || !models.find(m => m.size === selectedSize && m.downloaded)}
      >
        {t("onboarding.navigation.continue")}
      </button>
    </div>
  );
}
