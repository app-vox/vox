import { useState } from "react";
import { useConfigStore } from "../../stores/config-store";
import { useDebouncedSave } from "../../hooks/use-debounced-save";
import { useT } from "../../i18n-context";
import { SecretInput } from "../ui/SecretInput";
import form from "../shared/forms.module.scss";

export function BedrockFields() {
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
        <label htmlFor="llm-region">{t("llm.bedrock.region")}</label>
        <input
          id="llm-region"
          type="text"
          value={config.llm.region || ""}
          onChange={(e) => update("region", e.target.value)}
          onFocus={(e) => handleFocus("region", e.target.value)}
          onBlur={(e) => handleBlur("region", e.target.value)}
          placeholder="us-east-1"
        />
      </div>
      <div className={form.field}>
        <label htmlFor="llm-profile">{t("llm.bedrock.profile")}</label>
        <input
          id="llm-profile"
          type="text"
          value={config.llm.profile || ""}
          onChange={(e) => update("profile", e.target.value)}
          onFocus={(e) => handleFocus("profile", e.target.value)}
          onBlur={(e) => handleBlur("profile", e.target.value)}
          placeholder="default"
        />
        <p className={form.hint}>{t("llm.bedrock.profileHint")}</p>
      </div>
      <div className={form.field}>
        <label htmlFor="llm-access-key">{t("llm.bedrock.accessKeyId")}</label>
        <SecretInput
          id="llm-access-key"
          value={config.llm.accessKeyId || ""}
          onChange={(v) => update("accessKeyId", v)}
          onFocus={() => handleFocus("accessKeyId", config.llm.accessKeyId || "")}
          onBlur={() => handleBlur("accessKeyId", config.llm.accessKeyId || "")}
          placeholder={t("llm.bedrock.accessKeyPlaceholder")}
        />
        <p className={form.hint}>{t("llm.bedrock.accessKeyHint")}</p>
      </div>
      <div className={form.field}>
        <label htmlFor="llm-secret-key">{t("llm.bedrock.secretAccessKey")}</label>
        <SecretInput
          id="llm-secret-key"
          value={config.llm.secretAccessKey || ""}
          onChange={(v) => update("secretAccessKey", v)}
          onFocus={() => handleFocus("secretAccessKey", config.llm.secretAccessKey || "")}
          onBlur={() => handleBlur("secretAccessKey", config.llm.secretAccessKey || "")}
          placeholder={t("llm.bedrock.accessKeyPlaceholder")}
        />
      </div>
      <div className={form.field}>
        <label htmlFor="llm-model-id">{t("llm.bedrock.modelId")}</label>
        <input
          id="llm-model-id"
          type="text"
          value={config.llm.modelId || ""}
          onChange={(e) => update("modelId", e.target.value)}
          onFocus={(e) => handleFocus("modelId", e.target.value)}
          onBlur={(e) => handleBlur("modelId", e.target.value)}
          placeholder="anthropic.claude-3-5-sonnet-20241022-v2:0"
        />
      </div>
    </>
  );
}
