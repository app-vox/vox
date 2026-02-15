import { useState } from "react";
import { useConfigStore } from "../../stores/config-store";
import { useDebouncedSave } from "../../hooks/use-debounced-save";
import { useT } from "../../i18n-context";
import { SecretInput } from "../ui/SecretInput";
import form from "../shared/forms.module.scss";

export function FoundryFields() {
  const t = useT();
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const { debouncedSave, flush } = useDebouncedSave(500, true);
  const [focusedField, setFocusedField] = useState<{ field: string; value: string } | null>(null);

  if (!config) return null;
  const { llm } = config;
  if (llm.provider !== "foundry") return null;

  const update = (field: string, value: string) => {
    updateConfig({ llm: { ...llm, [field]: value } as typeof llm });
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
        <label htmlFor="llm-endpoint">{t("llm.foundry.endpoint")}</label>
        <input
          id="llm-endpoint"
          type="url"
          value={llm.endpoint}
          onChange={(e) => update("endpoint", e.target.value)}
          onFocus={(e) => handleFocus("endpoint", e.target.value)}
          onBlur={(e) => handleBlur("endpoint", e.target.value)}
          placeholder="https://your-resource.services.ai.azure.com/anthropic"
        />
      </div>
      <div className={form.field}>
        <label htmlFor="llm-apikey">{t("llm.foundry.apiKey")}</label>
        <SecretInput
          id="llm-apikey"
          value={llm.apiKey}
          onChange={(v) => update("apiKey", v)}
          onFocus={() => handleFocus("apiKey", llm.apiKey)}
          onBlur={() => handleBlur("apiKey", llm.apiKey)}
          placeholder={t("llm.foundry.apiKeyPlaceholder")}
        />
      </div>
      <div className={form.field}>
        <label htmlFor="llm-model">{t("llm.foundry.model")}</label>
        <input
          id="llm-model"
          type="text"
          value={llm.model}
          onChange={(e) => update("model", e.target.value)}
          onFocus={(e) => handleFocus("model", e.target.value)}
          onBlur={(e) => handleBlur("model", e.target.value)}
          placeholder="gpt-4o"
        />
      </div>
    </>
  );
}
