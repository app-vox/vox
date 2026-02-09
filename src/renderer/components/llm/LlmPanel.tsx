import { useState } from "react";
import { useConfigStore } from "../../stores/config-store";
import { useDebouncedSave } from "../../hooks/use-debounced-save";
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
          <h2>AI Text Correction (LLM)</h2>
          <p className={card.description}>
            Improve your transcriptions by automatically fixing grammar, removing filler words, and cleaning up your speech.
          </p>
        </div>
        <div className={card.warningBanner}>
          Setup required - Download a{" "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              useConfigStore.getState().setActiveTab("whisper");
            }}
            style={{ color: "inherit", textDecoration: "underline", cursor: "pointer" }}
          >
            local model
          </a>
          {" "}first to enable AI improvements
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
    setTestStatus({ text: "Testing connection...", type: "info" });
    await saveConfig();

    try {
      const result = await window.voxApi.llm.test();
      if (result.ok) {
        setTestStatus({ text: "Connection successful", type: "success" });
      } else {
        setTestStatus({ text: `Connection failed: ${result.error}`, type: "error" });
      }
    } catch (err: unknown) {
      setTestStatus({ text: `Connection failed: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className={card.card}>
      <div className={card.header}>
        <h2>AI Text Correction (with LLM)</h2>
        <p className={card.description}>
          Improve your transcriptions by automatically fixing grammar, removing filler words, and cleaning up your speech.
        </p>
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
            <p>Improve My Transcriptions with AI</p>
          </label>
          <p className={form.hint}>
            When off, you'll get the raw Whisper transcription. When on, AI will fix grammar, remove filler words (um, uh, like), and polish your text.
          </p>
        </div>

        {config.enableLlmEnhancement && (
          <>
            <div className={form.inlineTabs}>
              <button
                onClick={() => setActiveTab("provider")}
                className={`${form.inlineTab} ${activeTab === "provider" ? form.active : ""}`}
              >
                Provider
              </button>
              <button
                onClick={() => setActiveTab("prompt")}
                className={`${form.inlineTab} ${activeTab === "prompt" ? form.active : ""}`}
              >
                Custom Prompt
              </button>
            </div>

            {activeTab === "provider" && (
              <>
                <div className={form.field}>
                  <label htmlFor="llm-provider">Provider</label>
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
                    Test Connection
                  </button>
                  <StatusBox text={testStatus.text} type={testStatus.type} />
                </div>
              </>
            )}

            {activeTab === "prompt" && (
              <div className={form.field}>
                <label htmlFor="custom-prompt">Custom Instructions</label>
                <p className={form.hint}>
                  Your custom instructions will be added on top of Vox's default behavior (fix grammar, remove filler words, preserve meaning). Leave empty to use only the defaults.
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
                  placeholder="Add additional instructions for the AI..."
                  rows={12}
                  className={form.monospaceTextarea}
                  style={{ resize: "none" }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
