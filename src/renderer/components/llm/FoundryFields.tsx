import { useConfigStore } from "../../stores/config-store";
import { useDebouncedSave } from "../../hooks/use-debounced-save";
import { SecretInput } from "../ui/SecretInput";

export function FoundryFields() {
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const debouncedSave = useDebouncedSave();

  if (!config) return null;

  const update = (field: string, value: string) => {
    updateConfig({ llm: { ...config.llm, [field]: value } });
    debouncedSave();
  };

  return (
    <>
      <div className="field">
        <label htmlFor="llm-endpoint">Endpoint</label>
        <input
          id="llm-endpoint"
          type="url"
          value={config.llm.endpoint}
          onChange={(e) => update("endpoint", e.target.value)}
          placeholder="https://your-resource.services.ai.azure.com/anthropic"
        />
      </div>
      <div className="field">
        <label htmlFor="llm-apikey">API Key</label>
        <SecretInput
          id="llm-apikey"
          value={config.llm.apiKey}
          onChange={(v) => update("apiKey", v)}
          placeholder="Enter your API key"
        />
      </div>
      <div className="field">
        <label htmlFor="llm-model">Model</label>
        <input
          id="llm-model"
          type="text"
          value={config.llm.model}
          onChange={(e) => update("model", e.target.value)}
          placeholder="gpt-4o"
        />
      </div>
    </>
  );
}
