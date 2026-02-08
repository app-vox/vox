import { useState } from "react";
import { useConfigStore } from "../../stores/config-store";
import { FoundryFields } from "./FoundryFields";
import { BedrockFields } from "./BedrockFields";
import { StatusBox } from "../ui/StatusBox";
import type { LlmProviderType } from "../../../shared/config";
import card from "../shared/card.module.scss";
import btn from "../shared/buttons.module.scss";
import form from "../shared/forms.module.scss";

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
    <div className={card.card}>
      <div className={card.header}>
        <h2>LLM Provider</h2>
        <p className={card.description}>Configure the language model used for post-processing transcriptions.</p>
      </div>
      <div className={card.body}>
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
            className={`${btn.btn} ${btn.secondary} ${btn.sm}`}
          >
            Test Connection
          </button>
          <StatusBox text={testStatus.text} type={testStatus.type} />
        </div>
      </div>
    </div>
  );
}
