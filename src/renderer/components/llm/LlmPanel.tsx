import { useState } from "react";
import { useConfigStore } from "../../stores/config-store";
import { useDebouncedSave } from "../../hooks/use-debounced-save";
import { FoundryFields } from "./FoundryFields";
import { BedrockFields } from "./BedrockFields";
import { StatusBox } from "../ui/StatusBox";
import type { LlmProviderType } from "../../../shared/config";
import card from "../shared/card.module.scss";
import form from "../shared/forms.module.scss";
import buttons from "../shared/buttons.module.scss";

export function LlmPanel() {
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const saveConfig = useConfigStore((s) => s.saveConfig);
  const { debouncedSave, flush } = useDebouncedSave(500, true);
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<{ text: string; type: "info" | "success" | "error" }>({ text: "", type: "info" });
  const [activeTab, setActiveTab] = useState<"provider" | "prompt">("provider");

  if (!config) return null;

  const handleProviderChange = (provider: LlmProviderType) => {
    updateConfig({ llm: { ...config.llm, provider } });
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
        <h2>AI Text Correction (LLM)</h2>
        <p className={card.description}>
          Improve your transcriptions by automatically fixing grammar, removing filler words, and cleaning up your speech.
        </p>
      </div>
      <div className={card.body}>
        <div className={form.field}>
          <label htmlFor="enable-llm-enhancement" className={form.checkboxLabel}>
            <input
              type="checkbox"
              id="enable-llm-enhancement"
              checked={config.enableLlmEnhancement ?? false}
              onChange={(e) => {
                updateConfig({ enableLlmEnhancement: e.target.checked });
                saveConfig(true);
              }}
            />
            Improve My Transcriptions with AI
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
                  </select>
                </div>

                {config.llm.provider === "bedrock" ? <BedrockFields /> : <FoundryFields />}

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
                <textarea
                  id="custom-prompt"
                  value={config.customPrompt || ""}
                  onChange={(e) => {
                    updateConfig({ customPrompt: e.target.value });
                    debouncedSave();
                  }}
                  onBlur={flush}
                  placeholder="Add additional instructions for the AI..."
                  rows={12}
                  className={form.monospaceTextarea}
                />
                <p className={form.hint}>
                  Your custom instructions will be added on top of Vox's default behavior (fix grammar, remove filler words, preserve meaning). Leave empty to use only the defaults.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
