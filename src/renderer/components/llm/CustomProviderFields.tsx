import { useState } from "react";
import { useConfigStore } from "../../stores/config-store";
import { useDebouncedSave } from "../../hooks/use-debounced-save";
import { useT } from "../../i18n-context";
import { SecretInput } from "../ui/SecretInput";
import { CustomSelect } from "../ui/CustomSelect";
import type { CustomTokenSendAs } from "../../../shared/config";
import form from "../shared/forms.module.scss";

export function CustomProviderFields() {
  const t = useT();
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const saveConfig = useConfigStore((s) => s.saveConfig);
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
        <label htmlFor="llm-custom-endpoint">{t("llm.custom.endpoint")}</label>
        <input
          id="llm-custom-endpoint"
          type="url"
          value={config.llm.customEndpoint || ""}
          onChange={(e) => update("customEndpoint", e.target.value)}
          onFocus={(e) => handleFocus("customEndpoint", e.target.value)}
          onBlur={(e) => handleBlur("customEndpoint", e.target.value)}
          placeholder="https://my-api.example.com/v1/chat/completions"
        />
        <p className={form.hint}>{t("llm.custom.endpointHint")}</p>
      </div>
      <div className={form.field}>
        <label htmlFor="llm-custom-token">{t("llm.custom.token")}</label>
        <SecretInput
          id="llm-custom-token"
          value={config.llm.customToken || ""}
          onChange={(v) => update("customToken", v)}
          onFocus={() => handleFocus("customToken", config.llm.customToken || "")}
          onBlur={() => handleBlur("customToken", config.llm.customToken || "")}
          placeholder={t("llm.custom.tokenPlaceholder")}
        />
      </div>
      <div className={form.fieldRow}>
        <div className={form.field} style={{ flex: 1 }}>
          <label htmlFor="llm-custom-token-attr">{t("llm.custom.tokenAttr")}</label>
          <input
            id="llm-custom-token-attr"
            type="text"
            value={config.llm.customTokenAttr || ""}
            onChange={(e) => update("customTokenAttr", e.target.value)}
            onFocus={(e) => handleFocus("customTokenAttr", e.target.value)}
            onBlur={(e) => handleBlur("customTokenAttr", e.target.value)}
            placeholder="Authorization"
          />
        </div>
        <div className={form.field} style={{ width: 140, flexShrink: 0 }}>
          <label htmlFor="llm-custom-send-as">{t("llm.custom.sendAs")}</label>
          <CustomSelect
            id="llm-custom-send-as"
            value={config.llm.customTokenSendAs || "header"}
            items={[
              { value: "header", label: "Header" },
              { value: "body", label: "Body" },
              { value: "query", label: "Query Param" },
            ]}
            onChange={(value) => {
              updateConfig({ llm: { ...config.llm, customTokenSendAs: value as CustomTokenSendAs } });
              saveConfig(true);
            }}
          />
        </div>
      </div>
      <div className={form.field}>
        <label htmlFor="llm-custom-model">{t("llm.custom.model")}</label>
        <input
          id="llm-custom-model"
          type="text"
          value={config.llm.customModel || ""}
          onChange={(e) => update("customModel", e.target.value)}
          onFocus={(e) => handleFocus("customModel", e.target.value)}
          onBlur={(e) => handleBlur("customModel", e.target.value)}
          placeholder={t("llm.custom.modelPlaceholder")}
        />
        <p className={form.hint}>{t("llm.custom.modelHint")}</p>
      </div>
    </>
  );
}
