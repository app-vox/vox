import { useState } from "react";
import { useConfigStore } from "../../stores/config-store";
import { useDebouncedSave } from "../../hooks/use-debounced-save";
import { useSaveToast } from "../../hooks/use-save-toast";
import { FoundryFields } from "./FoundryFields";
import { BedrockFields } from "./BedrockFields";
import { StatusBox } from "../ui/StatusBox";
import type { LlmProviderType } from "../../../shared/config";

export function LlmPanel() {
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const saveConfig = useConfigStore((s) => s.saveConfig);
  const debouncedSave = useDebouncedSave();
  const triggerToast = useSaveToast((s) => s.trigger);
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<{ text: string; type: "info" | "success" | "error" }>({ text: "", type: "info" });
  const [activeTab, setActiveTab] = useState<"provider" | "prompt">("provider");

  if (!config) return null;

  const handleProviderChange = async (provider: LlmProviderType) => {
    updateConfig({ llm: { ...config.llm, provider } });
    await saveConfig(false);
    triggerToast();
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
    <div className="card">
      <div className="card-header">
        <h2>AI Text Correction (LLM)</h2>
        <p className="card-description">
          Improve your transcriptions by automatically fixing grammar, removing filler words, and cleaning up your speech.
        </p>
      </div>
      <div className="card-body">
        <div className="field">
          <label htmlFor="enable-llm-enhancement">
            <input
              type="checkbox"
              id="enable-llm-enhancement"
              checked={config.enableLlmEnhancement ?? false}
              onChange={async (e) => {
                updateConfig({ enableLlmEnhancement: e.target.checked });
                await saveConfig(false);
                triggerToast();
              }}
              style={{ width: "auto", marginRight: "8px" }}
            />
            Improve My Transcriptions with AI
          </label>
          <p className="field-hint">
            When off, you'll get the raw Whisper transcription. When on, AI will fix grammar, remove filler words (um, uh, like), and polish your text.
          </p>
        </div>

        {config.enableLlmEnhancement && (
          <>
            <div style={{
              display: "flex",
              gap: "8px",
              marginBottom: "16px",
              borderBottom: "1px solid var(--color-border, #e5e7eb)",
              marginTop: "8px",
            }}>
              <button
                onClick={() => setActiveTab("provider")}
                style={{
                  padding: "8px 16px",
                  background: "none",
                  border: "none",
                  borderBottom: activeTab === "provider" ? "2px solid #3b82f6" : "none",
                  color: activeTab === "provider" ? "#3b82f6" : "#6b7280",
                  fontWeight: activeTab === "provider" ? "600" : "400",
                  cursor: "pointer",
                  marginBottom: "-1px",
                }}
              >
                Provider
              </button>
              <button
                onClick={() => setActiveTab("prompt")}
                style={{
                  padding: "8px 16px",
                  background: "none",
                  border: "none",
                  borderBottom: activeTab === "prompt" ? "2px solid #3b82f6" : "none",
                  color: activeTab === "prompt" ? "#3b82f6" : "#6b7280",
                  fontWeight: activeTab === "prompt" ? "600" : "400",
                  cursor: "pointer",
                  marginBottom: "-1px",
                }}
              >
                Custom Prompt
              </button>
            </div>

            {activeTab === "provider" && (
              <>
                <div className="field">
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

                <div className="test-section">
                  <button
                    onClick={handleTest}
                    disabled={testing}
                    className="btn btn-secondary btn-sm"
                  >
                    Test Connection
                  </button>
                  <StatusBox text={testStatus.text} type={testStatus.type} />
                </div>
              </>
            )}

            {activeTab === "prompt" && (
              <div className="field">
                <label htmlFor="custom-prompt">Custom Instructions</label>
                <textarea
                  id="custom-prompt"
                  value={config.customPrompt || ""}
                  onChange={(e) => {
                    updateConfig({ customPrompt: e.target.value });
                    debouncedSave();
                  }}
                  onBlur={async () => {
                    await saveConfig(false);
                    triggerToast();
                  }}
                  placeholder="Add additional instructions for the AI..."
                  rows={12}
                  style={{ fontFamily: "monospace", fontSize: "12px", width: "100%", resize: "vertical" }}
                />
                <p className="field-hint">
                  Your custom instructions will be applied AFTER Vox's default text correction. Use this to add extra formatting or style preferences. Leave empty to use only the defaults.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
