import { useState } from "react";
import { useConfigStore } from "../../stores/config-store";
import { FoundryFields } from "./FoundryFields";
import { BedrockFields } from "./BedrockFields";
import { StatusBox } from "../ui/StatusBox";
import type { LlmProviderType } from "../../../shared/config";

export function LlmPanel() {
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const saveConfig = useConfigStore((s) => s.saveConfig);
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<{ text: string; type: "info" | "success" | "error" }>({ text: "", type: "info" });

  if (!config) return null;

  const handleProviderChange = (provider: LlmProviderType) => {
    updateConfig({ llm: { ...config.llm, provider } });
    saveConfig();
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
        <h2>LLM Provider</h2>
        <p className="card-description">
          Optionally configure a language model to enhance and correct transcriptions.
        </p>
      </div>
      <div className="card-body">
        <div className="field">
          <label htmlFor="enable-llm-enhancement">
            <input
              type="checkbox"
              id="enable-llm-enhancement"
              checked={config.enableLlmEnhancement ?? false}
              onChange={(e) => {
                updateConfig({ enableLlmEnhancement: e.target.checked });
                saveConfig();
              }}
              style={{ width: "auto", marginRight: "8px" }}
            />
            Enable LLM Enhancement
          </label>
          <p className="field-hint">
            When disabled, Vox will use Whisper transcription only.
            When enabled, transcriptions will be corrected and enhanced by an LLM.
          </p>
        </div>

        {config.enableLlmEnhancement && (
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
      </div>
    </div>
  );
}
