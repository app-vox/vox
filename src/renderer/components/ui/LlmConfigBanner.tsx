import { useConfigStore } from "../../stores/config-store";
import { useT } from "../../i18n-context";
import { computeLlmConfigHash } from "../../../shared/llm-config-hash";
import { Tabs } from "../../../shared/tabs";
import { LayersIcon } from "../../../shared/icons";
import { useDevOverrideValue } from "../../hooks/use-dev-override";
import styles from "./LlmConfigBanner.module.scss";

export function LlmConfigBanner() {
  const t = useT();
  const config = useConfigStore((s) => s.config);
  const activeTab = useConfigStore((s) => s.activeTab);
  const setActiveTab = useConfigStore((s) => s.setActiveTab);

  // Respect dev overrides in development (tree-shaken in production)
  const devEnhancement = import.meta.env.DEV
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useDevOverrideValue("llmEnhancementEnabled", undefined)
    : undefined;
  const devTested = import.meta.env.DEV
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useDevOverrideValue("llmConnectionTested", undefined)
    : undefined;

  const effectiveEnhancement = devEnhancement ?? config?.enableLlmEnhancement;
  const effectiveTested = devTested ?? config?.llmConnectionTested;

  if (!config) return null;
  if (!effectiveEnhancement) return null;
  if (effectiveTested && computeLlmConfigHash(config) === config.llmConfigHash) return null;
  if (activeTab === Tabs.AI_ENHANCEMENT) return null;

  return (
    <button
      className={styles.badge}
      onClick={() => setActiveTab(Tabs.AI_ENHANCEMENT)}
      title={t("ui.llmConfigBanner")}
    >
      <LayersIcon width={11} height={11} />
      {t("ui.llmConfigBanner")}
    </button>
  );
}
