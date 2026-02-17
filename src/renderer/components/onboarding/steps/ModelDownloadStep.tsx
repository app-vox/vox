import { useT } from "../../../i18n-context";
import { useOnboardingStore } from "../use-onboarding-store";
import { useOnlineStatus } from "../../../hooks/use-online-status";
import { useModelManager } from "../../../hooks/use-model-manager";
import { ModelSelector } from "../../ui/ModelSelector";
import { OfflineBanner } from "../../ui/OfflineBanner";
import styles from "../OnboardingOverlay.module.scss";
import btn from "../../shared/buttons.module.scss";

export function ModelDownloadStep() {
  const t = useT();
  const online = useOnlineStatus();
  const next = useOnboardingStore((s) => s.next);
  const modelManager = useModelManager();

  const hasDownloadedSelection = modelManager.models.some(
    (m) => m.size === modelManager.selectedSize && m.downloaded
  );

  return (
    <div className={styles.stepContent}>
      <h2 className={styles.stepTitle}>
        {t("onboarding.model.stepLabel", { current: "1", total: "8" })}
        {" — "}
        {t("onboarding.model.title")}
      </h2>
      <p className={styles.privacyNote}>{t("onboarding.model.privacyNote")}</p>

      <OfflineBanner />

      <ModelSelector
        models={modelManager.models}
        selectedSize={modelManager.selectedSize}
        downloading={modelManager.downloading}
        progress={modelManager.progress}
        onSelect={modelManager.select}
        onDownload={modelManager.download}
        onCancel={modelManager.cancelDownload}
        onDelete={modelManager.deleteModel}
        downloadDisabled={!online}
        recommendedSize="small"
        className={styles.modelList}
      />

      <button
        className={`${btn.btn} ${btn.primary} ${styles.ctaButton}`}
        onClick={next}
        disabled={!hasDownloadedSelection}
      >
        {t("onboarding.navigation.continue")}
      </button>
    </div>
  );
}
