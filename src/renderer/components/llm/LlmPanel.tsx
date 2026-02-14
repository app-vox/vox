import { useState } from "react";
import { useConfigStore } from "../../stores/config-store";
import { useDebouncedSave } from "../../hooks/use-debounced-save";
import { useT } from "../../i18n-context";
import { FoundryFields } from "./FoundryFields";
import { BedrockFields } from "./BedrockFields";
import { OpenAICompatibleFields } from "./OpenAICompatibleFields";
import { LiteLLMFields } from "./LiteLLMFields";
import { StatusBox } from "../ui/StatusBox";
import type { LlmProviderType } from "../../../shared/config";
import card from "../shared/card.module.scss";
import form from "../shared/forms.module.scss";
import buttons from "../shared/buttons.module.scss";

export function LlmPanel() {
  const t = useT();
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const saveConfig = useConfigStore((s) => s.saveConfig);
  const setupComplete = useConfigStore((s) => s.setupComplete);
  const { debouncedSave, flush } = useDebouncedSave(500, true);
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<{ text: string; type: "info" | "success" | "error" }>({ text: "", type: "info" });
  const [activeTab, setActiveTab] = useState<"provider" | "prompt">("provider");
  const [initialPromptValue, setInitialPromptValue] = useState<string | null>(null);

  if (!config) return null;

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
        </div>
      </div>
    );
  }

  const providerDefaults: Record<string, { openaiEndpoint: string; openaiModel: string }> = {
    openai: { openaiEndpoint: "https://api.openai.com", openaiModel: "gpt-4o" },
    deepseek: { openaiEndpoint: "https://api.deepseek.com", openaiModel: "deepseek-chat" },
    litellm: { openaiEndpoint: "http://localhost:4000", openaiModel: "gpt-4o" },
  };

  const handleProviderChange = (provider: LlmProviderType) => {
    const defaults = providerDefaults[provider];
    if (defaults) {
      updateConfig({ llm: { ...config.llm, provider, ...defaults } });
    } else {
      updateConfig({ llm: { ...config.llm, provider } });
    }
    saveConfig(true);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestStatus({ text: t("llm.testingConnection"), type: "info" });
    await saveConfig();

    try {
      const result = await window.voxApi.llm.test();
      if (result.ok) {
        setTestStatus({ text: t("llm.connectionSuccessful"), type: "success" });
      } else {
        setTestStatus({ text: t("llm.connectionFailed", { error: result.error ?? "" }), type: "error" });
      }
    } catch (err: unknown) {
      setTestStatus({ text: t("llm.connectionFailed", { error: err instanceof Error ? err.message : String(err) }), type: "error" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className={card.card}>
      <div className={card.header}>
        <h2>{t("llm.title")}</h2>
        <p className={card.description}>
          {t("llm.description")}
        </p>
        <button
          type="button"
          onClick={() => window.voxApi.shell.openExternal("https://github.com/app-vox/vox?tab=readme-ov-file#configuration")}
          className={card.learnMore}
        >
          {t("llm.learnMore")}
        </button>
      </div>
      <div className={card.body}>
        <div className={form.field}>
          <label htmlFor="enable-llm-enhancement">
            <input
              type="checkbox"
              id="enable-llm-enhancement"
              checked={config.enableLlmEnhancement ?? false}
              onChange={(e) => {
                updateConfig({ enableLlmEnhancement: e.target.checked });
                saveConfig(true);
              }}
            />
            <p>{t("llm.enableCheckbox")}</p>
          </label>
          <p className={form.hint}>
            {t("llm.enableHint")}
          </p>
        </div>

        {config.enableLlmEnhancement && (
          <>
            <div className={form.inlineTabs}>
              <button
                onClick={() => setActiveTab("provider")}
                className={`${form.inlineTab} ${activeTab === "provider" ? form.active : ""}`}
              >
                {t("llm.providerTab")}
              </button>
              <button
                onClick={() => setActiveTab("prompt")}
                className={`${form.inlineTab} ${activeTab === "prompt" ? form.active : ""}`}
              >
                {t("llm.customPromptTab")}
              </button>
            </div>

            {activeTab === "provider" && (
              <>
                <div className={form.field}>
                  <label htmlFor="llm-provider">{t("llm.providerLabel")}</label>
                  <select
                    id="llm-provider"
                    value={config.llm.provider || "foundry"}
                    onChange={(e) => handleProviderChange(e.target.value as LlmProviderType)}
                  >
                    <option value="foundry">Microsoft Foundry</option>
                    <option value="bedrock">AWS Bedrock</option>
                    <option value="openai">OpenAI</option>
                    <option value="deepseek">DeepSeek</option>
                    <option value="litellm">LiteLLM</option>
                  </select>
                </div>

                {config.llm.provider === "litellm" ? (
                  <LiteLLMFields />
                ) : (config.llm.provider === "openai" || config.llm.provider === "deepseek") ? (
                  <OpenAICompatibleFields providerType={config.llm.provider} />
                ) : config.llm.provider === "bedrock" ? (
                  <BedrockFields />
                ) : (
                  <FoundryFields />
                )}

                <div className={form.testSection}>
                  <button
                    onClick={handleTest}
                    disabled={testing}
                    className={`${buttons.btn} ${buttons.primary}`}
                  >
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
                  {/* eslint-disable-next-line i18next/no-literal-string */}
                  <summary>
                    💡 {t("llm.exampleInstructions")}
                  </summary>
                  <ul>
                    <li><strong>{t("llm.exampleProfessionalLabel")}</strong> {t("llm.exampleProfessional")}</li>
                    <li><strong>{t("llm.exampleFormalLabel")}</strong> {t("llm.exampleFormal")}</li>
                    <li><strong>{t("llm.exampleCasualLabel")}</strong> {t("llm.exampleCasual")}</li>
                    <li><strong>{t("llm.exampleFunnyLabel")}</strong> {t("llm.exampleFunny")}</li>
                    <li><strong>{t("llm.exampleEmojisLabel")}</strong> {t("llm.exampleEmojis")}</li>
                    <li><strong>{t("llm.exampleConciseLabel")}</strong> {t("llm.exampleConcise")}</li>
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
