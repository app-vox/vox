import { useState } from "react";
import { useConfigStore } from "../../stores/config-store";
import { useDebouncedSave } from "../../hooks/use-debounced-save";
import { useT } from "../../i18n-context";
import { SecretInput } from "../ui/SecretInput";
import form from "../shared/forms.module.scss";

const PROVIDER_DEFAULTS: Record<string, { endpoint: string; model: string; label: string }> = {
  openai: { endpoint: "https://api.openai.com", model: "gpt-4o", label: "OpenAI" },
  deepseek: { endpoint: "https://api.deepseek.com", model: "deepseek-chat", label: "DeepSeek" },
  glm: { endpoint: "https://open.bigmodel.cn/api/paas/v4", model: "glm-4", label: "GLM" },
};

export function OpenAICompatibleFields({ providerType }: { providerType: "openai" | "deepseek" | "glm" }) {
  const t = useT();
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const { debouncedSave, flush } = useDebouncedSave(500, true);
  const [focusedField, setFocusedField] = useState<{ field: string; value: string } | null>(null);

  if (!config) return null;

  const defaults = PROVIDER_DEFAULTS[providerType];

  const update = (field: string, value: string) => {
    updateConfig({ llm: { ...config.llm, [field]: value } as typeof config.llm });
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
        <label htmlFor="llm-openai-apikey">{t("llm.openai.apiKey")}</label>
        <SecretInput
          id="llm-openai-apikey"
          value={config.llm.openaiApiKey || ""}
          onChange={(v) => update("openaiApiKey", v)}
          onFocus={() => handleFocus("openaiApiKey", config.llm.openaiApiKey || "")}
          onBlur={() => handleBlur("openaiApiKey", config.llm.openaiApiKey || "")}
          placeholder={t("llm.openai.apiKeyPlaceholder")}
        />
      </div>
      <div className={form.field}>
        <label htmlFor="llm-openai-model">{t("llm.openai.model")}</label>
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
        <label htmlFor="llm-openai-endpoint">{t("llm.openai.endpoint")}</label>
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
          {t("llm.openai.endpointHint", { provider: defaults.label })}
        </p>
      </div>
    </>
  );
}
