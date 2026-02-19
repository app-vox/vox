import { useT } from "../../../i18n-context";
import { useOnboardingStore } from "../use-onboarding-store";
import { useOnlineStatus } from "../../../hooks/use-online-status";
import { useModelManager } from "../../../hooks/use-model-manager";
import { useDevOverrideValue } from "../../../hooks/use-dev-override";
import { useConfigStore } from "../../../stores/config-store";
import { ModelSelector } from "../../ui/ModelSelector";
import { OfflineBanner } from "../../ui/OfflineBanner";
import styles from "../OnboardingOverlay.module.scss";
import btn from "../../shared/buttons.module.scss";

export function ModelDownloadStep() {
  const t = useT();
  const online = useOnlineStatus();
  const next = useOnboardingStore((s) => s.next);
  const modelManager = useModelManager();
  const realSetupComplete = useConfigStore((s) => s.setupComplete);

  const setupComplete = import.meta.env.DEV
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useDevOverrideValue("setupComplete", realSetupComplete)
    : realSetupComplete;

  const hasDownloadedSelection = setupComplete !== false && modelManager.models.some(
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
        models={setupComplete === false ? modelManager.models.map((m) => ({ ...m, downloaded: false })) : modelManager.models}
        selectedSize={setupComplete === false ? "" : modelManager.selectedSize}
        downloading={modelManager.downloading}
        progress={modelManager.progress}
        onSelect={modelManager.select}
        onDownload={modelManager.download}
        onCancel={modelManager.cancelDownload}
        onDelete={modelManager.deleteModel}
        downloadDisabled={!online || setupComplete === false}
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
