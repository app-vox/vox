import { useState } from "react";
import { useConfigStore } from "../../stores/config-store";
import { useDebouncedSave } from "../../hooks/use-debounced-save";
import { useT } from "../../i18n-context";
import { SecretInput } from "../ui/SecretInput";
import form from "../shared/forms.module.scss";

export function AnthropicFields() {
  const t = useT();
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const { debouncedSave, flush } = useDebouncedSave(500, true);
  const [focusedField, setFocusedField] = useState<{ field: string; value: string } | null>(null);

  if (!config) return null;
  const { llm } = config;
  if (llm.provider !== "anthropic") return null;

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
        <label htmlFor="llm-anthropic-apikey">{t("llm.anthropic.apiKey")}</label>
        <SecretInput
          id="llm-anthropic-apikey"
          value={llm.anthropicApiKey || ""}
          onChange={(v) => update("anthropicApiKey", v)}
          onFocus={() => handleFocus("anthropicApiKey", llm.anthropicApiKey || "")}
          onBlur={() => handleBlur("anthropicApiKey", llm.anthropicApiKey || "")}
          placeholder={t("llm.anthropic.apiKeyPlaceholder")}
        />
      </div>
      <div className={form.field}>
        <label htmlFor="llm-anthropic-model">{t("llm.anthropic.model")}</label>
        <input
          id="llm-anthropic-model"
          type="text"
          value={llm.anthropicModel || ""}
          onChange={(e) => update("anthropicModel", e.target.value)}
          onFocus={(e) => handleFocus("anthropicModel", e.target.value)}
          onBlur={(e) => handleBlur("anthropicModel", e.target.value)}
          placeholder="claude-sonnet-4-20250514"
        />
      </div>
    </>
  );
}
