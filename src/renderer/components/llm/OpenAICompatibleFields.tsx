import { useState } from "react";
import { useConfigStore } from "../../stores/config-store";
import { useDebouncedSave } from "../../hooks/use-debounced-save";
import { SecretInput } from "../ui/SecretInput";
import form from "../shared/forms.module.scss";

const PROVIDER_DEFAULTS: Record<string, { endpoint: string; model: string }> = {
  openai: { endpoint: "https://api.openai.com", model: "gpt-4o" },
  deepseek: { endpoint: "https://api.deepseek.com", model: "deepseek-chat" },
};

export function OpenAICompatibleFields({ providerType }: { providerType: "openai" | "deepseek" }) {
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const { debouncedSave, flush } = useDebouncedSave(500, true);
  const [focusedField, setFocusedField] = useState<{ field: string; value: string } | null>(null);

  if (!config) return null;

  const defaults = PROVIDER_DEFAULTS[providerType];

  const update = (field: string, value: string) => {
    updateConfig({ llm: { ...config.llm, [field]: value } });
    debouncedSave();
  };

  const handleFocus = (field: string, value: string) => {
    setFocusedField({ field, value });
  };

  const handleBlur = (field: string, currentValue: string) => {
    if (focusedField && focusedField.field === field && focusedField.value !== currentValue) {
      flush();
    }
    setFocusedField(null);
  };

  return (
    <>
      <div className={form.field}>
        <label htmlFor="llm-openai-apikey">API Key</label>
        <SecretInput
          id="llm-openai-apikey"
          value={config.llm.openaiApiKey || ""}
          onChange={(v) => update("openaiApiKey", v)}
          onFocus={() => handleFocus("openaiApiKey", config.llm.openaiApiKey || "")}
          onBlur={() => handleBlur("openaiApiKey", config.llm.openaiApiKey || "")}
          placeholder="Enter your API key"
        />
      </div>
      <div className={form.field}>
        <label htmlFor="llm-openai-model">Model</label>
        <input
          id="llm-openai-model"
          type="text"
          value={config.llm.openaiModel || ""}
          onChange={(e) => update("openaiModel", e.target.value)}
          onFocus={(e) => handleFocus("openaiModel", e.target.value)}
          onBlur={(e) => handleBlur("openaiModel", e.target.value)}
          placeholder={defaults.model}
        />
      </div>
      <div className={form.field}>
        <label htmlFor="llm-openai-endpoint">Endpoint</label>
        <input
          id="llm-openai-endpoint"
          type="url"
          value={config.llm.openaiEndpoint || ""}
          onChange={(e) => update("openaiEndpoint", e.target.value)}
          onFocus={(e) => handleFocus("openaiEndpoint", e.target.value)}
          onBlur={(e) => handleBlur("openaiEndpoint", e.target.value)}
          placeholder={defaults.endpoint}
        />
        <p className={form.hint}>
          Pre-filled for {providerType === "openai" ? "OpenAI" : "DeepSeek"}. Change only if using a custom endpoint.
        </p>
      </div>
    </>
  );
}
