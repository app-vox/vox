import { useState, useCallback, useRef, useEffect } from "react";
import { useConfigStore } from "../../stores/config-store";
import { useDevOverrideValue } from "../../hooks/use-dev-override";
import { useDebouncedSave } from "../../hooks/use-debounced-save";
import { useT } from "../../i18n-context";
import { FoundryFields } from "./FoundryFields";
import { BedrockFields } from "./BedrockFields";
import { OpenAICompatibleFields } from "./OpenAICompatibleFields";
import { LiteLLMFields } from "./LiteLLMFields";
import { AnthropicFields } from "./AnthropicFields";
import { CustomProviderFields } from "./CustomProviderFields";
import { StatusBox } from "../ui/StatusBox";
import { NewDot } from "../ui/NewDot";
import { CustomSelect } from "../ui/CustomSelect";
import { ExternalLinkIcon, CheckCircleIcon, InfoCircleAltIcon, CopyIcon, SparkleIcon, PlayIcon } from "../../../shared/icons";
import type { LlmProviderType, LlmConfig } from "../../../shared/config";
import { isProviderConfigured } from "../../../shared/llm-utils";
import { computeLlmConfigHash } from "../../../shared/llm-config-hash";
import card from "../shared/card.module.scss";
import form from "../shared/forms.module.scss";
import buttons from "../shared/buttons.module.scss";
import styles from "./LlmPanel.module.scss";

export function LlmPanel() {
  const t = useT();
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const saveConfig = useConfigStore((s) => s.saveConfig);
  const realSetupComplete = useConfigStore((s) => s.setupComplete);
  const { debouncedSave, flush } = useDebouncedSave(500, true);
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<{ text: string; type: "info" | "success" | "error" }>({ text: "", type: "info" });
  const [activeTab, setActiveTab] = useState<"provider" | "prompt">("provider");
  const [initialPromptValue, setInitialPromptValue] = useState<string | null>(null);
  const [visitedCustomPrompt, setVisitedCustomPrompt] = useState(() => localStorage.getItem("vox:visited-custom-prompt") === "true");
  const [copiedExample, setCopiedExample] = useState<string | null>(null);
  const testSectionRef = useRef<HTMLDivElement>(null);

  const configHash = config ? computeLlmConfigHash(config) : "";
  const prevHashRef = useRef(configHash);
  useEffect(() => {
    if (prevHashRef.current && prevHashRef.current !== configHash) {
      setTestStatus({ text: "", type: "info" });
    }
    prevHashRef.current = configHash;
  }, [configHash]);

  // Dev overrides (gated — tree-shaken in production)
  const setupComplete = import.meta.env.DEV
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useDevOverrideValue("setupComplete", realSetupComplete)
    : realSetupComplete;

  const devLlmEnhancement = import.meta.env.DEV
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useDevOverrideValue("llmEnhancementEnabled", undefined)
    : undefined;

  const devLlmTested = import.meta.env.DEV
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useDevOverrideValue("llmConnectionTested", undefined)
    : undefined;

  const handlePromptTabClick = useCallback(() => {
    if (!visitedCustomPrompt) {
      setVisitedCustomPrompt(true);
      localStorage.setItem("vox:visited-custom-prompt", "true");
    }
    setActiveTab("prompt");
  }, [visitedCustomPrompt]);

  if (!config) return null;

  const effectiveEnhancement = devLlmEnhancement ?? config.enableLlmEnhancement;
  const effectiveTested = devLlmTested ?? config.llmConnectionTested;

  const needsTest = effectiveEnhancement
    && (!effectiveTested || computeLlmConfigHash(config) !== config.llmConfigHash);

  if (!setupComplete) {
    return (
      <div className={card.card}>
        <div className={card.header}>
          <h2>{t("llm.setupTitle")}</h2>
          <p className={card.description}>
            {t("llm.setupDescription")}
          </p>
        </div>
        <div className={card.warningBanner}>
          <span>
            {t("llm.setupRequired")}{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                useConfigStore.getState().setActiveTab("whisper");
              }}
              style={{ color: "inherit", textDecoration: "underline", cursor: "pointer" }}
            >
              {t("llm.setupLocalModel")}
            </a>
            {" "}{t("llm.setupSuffix")}
          </span>
        </div>
      </div>
    );
  }

  const handleProviderChange = (provider: LlmProviderType) => {
    let newLlm: LlmConfig;
    switch (provider) {
      case "foundry":
        newLlm = { provider: "foundry", endpoint: "", apiKey: "", model: "gpt-4o" };
        break;
      case "bedrock":
        newLlm = { provider: "bedrock", region: "us-east-1", profile: "", accessKeyId: "", secretAccessKey: "", modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0" };
        break;
      case "openai":
        newLlm = { provider: "openai", openaiApiKey: "", openaiModel: "gpt-4o", openaiEndpoint: "https://api.openai.com" };
        break;
      case "deepseek":
        newLlm = { provider: "deepseek", openaiApiKey: "", openaiModel: "deepseek-chat", openaiEndpoint: "https://api.deepseek.com" };
        break;
      case "glm":
        newLlm = { provider: "glm", openaiApiKey: "", openaiModel: "glm-4", openaiEndpoint: "https://open.bigmodel.cn/api/paas/v4" };
        break;
      case "litellm":
        newLlm = { provider: "litellm", openaiApiKey: "", openaiModel: "gpt-4o", openaiEndpoint: "http://localhost:4000" };
        break;
      case "anthropic":
        newLlm = { provider: "anthropic", anthropicApiKey: "", anthropicModel: "claude-sonnet-4-20250514" };
        break;
      case "custom":
        newLlm = { provider: "custom", customEndpoint: "", customToken: "", customTokenAttr: "Authorization", customTokenSendAs: "header", customModel: "" };
        break;
      default:
        newLlm = { provider: "foundry", endpoint: "", apiKey: "", model: "gpt-4o" };
    }
    updateConfig({ llm: newLlm });
    saveConfig(true);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestStatus({ text: t("llm.testingConnection"), type: "info" });

    try {
      const result = await window.voxApi.llm.test(config);
      const freshConfig = await window.voxApi.config.load();
      updateConfig({
        llmConnectionTested: freshConfig.llmConnectionTested,
        llmConfigHash: freshConfig.llmConfigHash,
      });
      if (result.ok) {
        setTestStatus({ text: t("llm.connectionSuccessful"), type: "success" });
      } else {
        setTestStatus({ text: t("llm.connectionFailed", { error: result.error ?? "" }), type: "error" });
      }
    } catch (err: unknown) {
      setTestStatus({ text: t("llm.connectionFailed", { error: err instanceof Error ? err.message : String(err) }), type: "error" });
    } finally {
      setTesting(false);
      testSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  };

  return (
    <div className={card.card}>
      <div className={card.header}>
        <h2>{t("llm.title")} <span className={card.titleSuffix}>{t("llm.titleSuffix")}</span></h2>
        <p className={card.description}>
          {t("llm.description")}
        </p>
        <button
          type="button"
          onClick={() => window.voxApi.shell.openExternal("https://github.com/app-vox/vox?tab=readme-ov-file#configuration")}
          className={card.learnMore}
        >
          {t("llm.learnMore")}
          <ExternalLinkIcon width={12} height={12} />
        </button>
      </div>
      <div className={card.body}>
        <div
          className={`${styles.enhanceToggle} ${effectiveEnhancement ? styles.active : ""}`}
          role="switch"
          aria-checked={effectiveEnhancement ?? false}
          tabIndex={0}
          onClick={() => {
            updateConfig({ enableLlmEnhancement: !config.enableLlmEnhancement });
            saveConfig(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              updateConfig({ enableLlmEnhancement: !config.enableLlmEnhancement });
              saveConfig(true);
            }
          }}
        >
          <div className={styles.enhanceIcon}>
            <SparkleIcon width={18} height={18} />
          </div>
          <div className={styles.enhanceText}>
            <div className={styles.enhanceTitle}>{t("llm.enableCheckbox")}</div>
            <div className={styles.enhanceDesc}>{t("llm.enableHint")}</div>
          </div>
          <div className={`${styles.toggle} ${effectiveEnhancement ? styles.toggleOn : ""}`} />
        </div>

        {effectiveEnhancement && (
          <>
            {needsTest && (
              <div className={card.warningBannerInline}>
                {t("llm.connectionTestRequired")}
              </div>
            )}

            <div className={form.inlineTabs}>
              <button
                onClick={() => setActiveTab("provider")}
                className={`${form.inlineTab} ${activeTab === "provider" ? form.active : ""}`}
              >
                {t("llm.providerTab")}
              </button>
              <button
                onClick={handlePromptTabClick}
                className={`${form.inlineTab} ${activeTab === "prompt" ? form.active : ""}`}
              >
                {t("llm.customPromptTab")}
                {!visitedCustomPrompt && <NewDot />}
              </button>
            </div>

            {activeTab === "provider" && (
              <>
                <div className={form.field}>
                  <label htmlFor="llm-provider">{t("llm.providerLabel")}</label>
                  <CustomSelect
                    id="llm-provider"
                    value={config.llm.provider || "foundry"}
                    items={([
                      { value: "foundry", label: "Microsoft Foundry" },
                      { value: "bedrock", label: "AWS Bedrock" },
                      { value: "openai", label: "OpenAI" },
                      { value: "deepseek", label: "DeepSeek" },
                      { value: "glm", label: "GLM (Zhipu AI)" },
                      { value: "anthropic", label: "Anthropic" },
                      { value: "litellm", label: "LiteLLM" },
                      { value: "custom", label: t("llm.custom.label") },
                    ] as const).map((item) => ({
                      ...item,
                      suffix: isProviderConfigured(item.value, config.llm)
                        ? <CheckCircleIcon width={14} height={14} style={{ color: "var(--color-accent)" }} />
                        : undefined,
                    }))}
                    onChange={(value) => handleProviderChange(value as LlmProviderType)}
                  />
                </div>

                {config.llm.provider === "litellm" ? (
                  <LiteLLMFields />
                ) : (config.llm.provider === "openai" || config.llm.provider === "deepseek" || config.llm.provider === "glm") ? (
                  <OpenAICompatibleFields providerType={config.llm.provider} />
                ) : config.llm.provider === "bedrock" ? (
                  <BedrockFields />
                ) : config.llm.provider === "anthropic" ? (
                  <AnthropicFields />
                ) : config.llm.provider === "custom" ? (
                  <CustomProviderFields />
                ) : (
                  <FoundryFields />
                )}

                <div className={form.testSection} ref={testSectionRef}>
                  <button
                    onClick={handleTest}
                    disabled={testing}
                    className={`${buttons.btn} ${buttons.primary}`}
                  >
                    <PlayIcon width={14} height={14} />
                    {t("llm.testConnection")}
                  </button>
                  <StatusBox text={testStatus.text} type={testStatus.type} />
                </div>
              </>
            )}

            {activeTab === "prompt" && (
              <div className={form.field}>
                <label htmlFor="custom-prompt">{t("llm.customInstructions")}</label>
                <p className={form.hint}>
                  {t("llm.customInstructionsHint")}
                </p>
                <textarea
                  id="custom-prompt"
                  value={config.customPrompt || ""}
                  onChange={(e) => {
                    updateConfig({ customPrompt: e.target.value });
                    debouncedSave();
                  }}
                  onFocus={() => {
                    setInitialPromptValue(config.customPrompt || "");
                  }}
                  onBlur={() => {
                    const currentValue = config.customPrompt || "";
                    const hasChanged = initialPromptValue !== null && initialPromptValue !== currentValue;
                    if (hasChanged) {
                      flush();
                    }
                    setInitialPromptValue(null);
                  }}
                  placeholder={t("llm.customInstructionsPlaceholder")}
                  rows={12}
                  className={form.monospaceTextarea}
                  style={{ resize: "none" }}
                />
                <details className={form.exampleDetails}>
                  <summary>
                    <InfoCircleAltIcon width={13} height={13} />
                    {t("llm.exampleInstructions")}
                  </summary>
                  <ul>
                    {([
                      { label: t("llm.exampleProfessionalLabel"), text: t("llm.exampleProfessional"), key: "professional" },
                      { label: t("llm.exampleFormalLabel"), text: t("llm.exampleFormal"), key: "formal" },
                      { label: t("llm.exampleCasualLabel"), text: t("llm.exampleCasual"), key: "casual" },
                      { label: t("llm.exampleFunnyLabel"), text: t("llm.exampleFunny"), key: "funny" },
                      { label: t("llm.exampleEmojisLabel"), text: t("llm.exampleEmojis"), key: "emojis" },
                      { label: t("llm.exampleConciseLabel"), text: t("llm.exampleConcise"), key: "concise" },
                      { label: t("llm.exampleLanguageLabel"), text: t("llm.exampleLanguage"), key: "language" },
                    ]).map((ex) => (
                      <li key={ex.key} className={form.exampleItem}>
                        <span><strong>{ex.label}</strong> {ex.text}</span>
                        <button
                          type="button"
                          className={form.exampleCopyBtn}
                          title={copiedExample === ex.key ? t("history.copied") : t("history.copy")}
                          onClick={() => {
                            const clean = ex.text.replace(/^[""\u201C]|[""\u201D]$/g, "");
                            window.voxApi.clipboard.write(clean);
                            setCopiedExample(ex.key);
                            setTimeout(() => setCopiedExample((prev) => prev === ex.key ? null : prev), 1500);
                          }}
                        >
                          {copiedExample === ex.key
                            ? <CheckCircleIcon width={12} height={12} />
                            : <CopyIcon width={12} height={12} />
                          }
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
