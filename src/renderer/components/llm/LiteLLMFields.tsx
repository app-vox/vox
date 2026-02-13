import { useState } from "react";
import { useConfigStore } from "../../stores/config-store";
import { useDebouncedSave } from "../../hooks/use-debounced-save";
import { useT } from "../../i18n-context";
import { SecretInput } from "../ui/SecretInput";
import form from "../shared/forms.module.scss";

const DEFAULTS = {
  endpoint: "http://localhost:4000",
  model: "gpt-4o",
};

export function LiteLLMFields() {
  const t = useT();
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const { debouncedSave, flush } = useDebouncedSave(500, true);
  const [focusedField, setFocusedField] = useState<{ field: string; value: string } | null>(null);

  if (!config) return null;

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
        <label htmlFor="llm-litellm-endpoint">{t("llm.litellm.endpoint")}</label>
        <input
          id="llm-litellm-endpoint"
          type="url"
          value={config.llm.openaiEndpoint || ""}
          onChange={(e) => update("openaiEndpoint", e.target.value)}
          onFocus={(e) => handleFocus("openaiEndpoint", e.target.value)}
          onBlur={(e) => handleBlur("openaiEndpoint", e.target.value)}
          placeholder={DEFAULTS.endpoint}
        />
        <p className={form.hint}>
          {t("llm.litellm.endpointHint")}
        </p>
      </div>
      <div className={form.field}>
        <label htmlFor="llm-litellm-apikey">{t("llm.litellm.apiKey")}</label>
        <SecretInput
          id="llm-litellm-apikey"
          value={config.llm.openaiApiKey || ""}
          onChange={(v) => update("openaiApiKey", v)}
          onFocus={() => handleFocus("openaiApiKey", config.llm.openaiApiKey || "")}
          onBlur={() => handleBlur("openaiApiKey", config.llm.openaiApiKey || "")}
          placeholder={t("llm.litellm.apiKeyPlaceholder")}
        />
        <p className={form.hint}>
          {t("llm.litellm.apiKeyHint")}
        </p>
      </div>
      <div className={form.field}>
        <label htmlFor="llm-litellm-model">{t("llm.litellm.model")}</label>
        <input
          id="llm-litellm-model"
          type="text"
          value={config.llm.openaiModel || ""}
          onChange={(e) => update("openaiModel", e.target.value)}
          onFocus={(e) => handleFocus("openaiModel", e.target.value)}
          onBlur={(e) => handleBlur("openaiModel", e.target.value)}
          placeholder={DEFAULTS.model}
        />
        <p className={form.hint}>
          {t("llm.litellm.modelHint")}
        </p>
      </div>
    </>
  );
}
