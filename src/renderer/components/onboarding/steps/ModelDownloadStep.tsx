import { useState, useEffect, useCallback } from "react";
import { useT } from "../../../i18n-context";
import { useOnboardingStore } from "../use-onboarding-store";
import { useOnlineStatus } from "../../../hooks/use-online-status";
import { useConfigStore } from "../../../stores/config-store";
import { OfflineBanner } from "../../ui/OfflineBanner";
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
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const saveConfig = useConfigStore((s) => s.saveConfig);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedSize, setSelectedSize] = useState<string>(RECOMMENDED_MODEL);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [progress, setProgress] = useState({ downloaded: 0, total: 0 });

  const refreshModels = useCallback(async () => {
    const list = await window.voxApi.models.list();
    setModels(list);
    const anyDownloaded = list.some((m) => m.downloaded);
    setModelDownloaded(anyDownloaded);
    if (anyDownloaded && !list.find((m) => m.size === selectedSize && m.downloaded)) {
      const first = list.find((m) => m.downloaded);
      if (first) setSelectedSize(first.size);
    }
  }, [setModelDownloaded, selectedSize]);

  useEffect(() => {
    refreshModels(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [refreshModels]);

  useEffect(() => {
    const cleanup = window.voxApi.models.onDownloadProgress((p) => {
      if (p.size === downloading) {
        setProgress({ downloaded: p.downloaded, total: p.total });
        if (p.downloaded === p.total && p.total > 0) {
          setTimeout(() => {
            setDownloading(null);
            setProgress({ downloaded: 0, total: 0 });
            refreshModels();
          }, 100);
        }
      }
    });
    return cleanup;
  }, [downloading, refreshModels]);

  const handleDownload = async (size: string) => {
    setDownloading(size);
    setSelectedSize(size);
    setProgress({ downloaded: 0, total: 0 });
    try {
      await window.voxApi.models.download(size);
      updateConfig({ whisper: { model: size as WhisperModelSize } });
      await saveConfig(false);
    } catch {
      setDownloading(null);
    }
  };

  const handleCancel = async () => {
    if (downloading) {
      await window.voxApi.models.cancelDownload(downloading);
      setDownloading(null);
      setProgress({ downloaded: 0, total: 0 });
    }
  };

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

  const percent = progress.total > 0
    ? Math.min(100, Math.round((progress.downloaded / progress.total) * 100))
    : 0;

  return (
    <div className={styles.stepContent}>
      <h2 className={styles.stepTitle}>
        {t("onboarding.model.stepLabel", { current: "1", total: "4" })}
        {" — "}
        {t("onboarding.model.title")}
      </h2>
      <p className={styles.privacyNote}>{t("onboarding.model.privacyNote")}</p>

      <OfflineBanner />

      <div className={styles.modelList}>
        {models.map((model) => {
          const isDownloading = downloading === model.size;
          const isRecommended = model.size === RECOMMENDED_MODEL;
          return (
            <label
              key={model.size}
              className={`${styles.modelRow} ${selectedSize === model.size ? styles.modelRowSelected : ""}`}
            >
              <input
                type="radio"
                name="onboarding-model"
                checked={selectedSize === model.size}
                onChange={() => handleSelect(model.size)}
              />
              <div className={styles.modelInfo}>
                <span className={styles.modelName}>
                  {t("whisper.model." + model.size + ".label")}
                  {isRecommended && (
                    <span className={styles.recommendedBadge}>{t("onboarding.model.recommended")}</span>
                  )}
                </span>
                <span className={styles.modelDesc}>{t("whisper.model." + model.size + ".description")}</span>
              </div>
              <div className={styles.modelAction}>
                {isDownloading ? (
                  <div className={styles.modelProgress}>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: `${percent}%` }} />
                    </div>
                    {/* eslint-disable-next-line i18next/no-literal-string */}
                    <span className={styles.progressText}>{percent}%</span>
                    {/* eslint-disable-next-line i18next/no-literal-string */}
                    <button className={styles.cancelBtn} onClick={handleCancel} type="button">&times;</button>
                  </div>
                ) : model.downloaded ? (
                  <span className={styles.downloadedBadge}>{t("model.downloaded")}</span>
                ) : (
                  <button
                    className={`${btn.btn} ${btn.secondary} ${btn.sm}`}
                    onClick={() => handleDownload(model.size)}
                    disabled={!online}
                    type="button"
                  >
                    {t("model.download")}
                  </button>
                )}
              </div>
            </label>
          );
        })}
      </div>

      <button
        className={`${btn.btn} ${btn.primary} ${styles.ctaButton}`}
        onClick={handleContinue}
        disabled={!modelDownloaded}
      >
        {t("onboarding.navigation.continue")}
      </button>
    </div>
  );
}
