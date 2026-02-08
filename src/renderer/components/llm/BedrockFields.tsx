import { useConfigStore } from "../../stores/config-store";
import { useDebouncedSave } from "../../hooks/use-debounced-save";
import { useSaveToast } from "../../hooks/use-save-toast";
import { SecretInput } from "../ui/SecretInput";
import form from "../shared/forms.module.scss";

export function BedrockFields() {
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const saveConfig = useConfigStore((s) => s.saveConfig);
  const debouncedSave = useDebouncedSave();
  const triggerToast = useSaveToast((s) => s.trigger);

  if (!config) return null;

  const update = (field: string, value: string) => {
    updateConfig({ llm: { ...config.llm, [field]: value } });
    debouncedSave();
  };

  const handleBlur = async () => {
    await saveConfig(false);
    triggerToast();
  };

  return (
    <>
      <div className={form.field}>
        <label htmlFor="llm-region">Region</label>
        <input
          id="llm-region"
          type="text"
          value={config.llm.region || ""}
          onChange={(e) => update("region", e.target.value)}
          onBlur={handleBlur}
          placeholder="us-east-1"
        />
      </div>
      <div className={form.field}>
        <label htmlFor="llm-profile">AWS Profile</label>
        <input
          id="llm-profile"
          type="text"
          value={config.llm.profile || ""}
          onChange={(e) => update("profile", e.target.value)}
          onBlur={handleBlur}
          placeholder="default"
        />
        <p className={form.hint}>Optional. Named profile from ~/.aws/credentials. Ignored when Access Key ID is provided.</p>
      </div>
      <div className={form.field}>
        <label htmlFor="llm-access-key">Access Key ID</label>
        <SecretInput
          id="llm-access-key"
          value={config.llm.accessKeyId || ""}
          onChange={(v) => update("accessKeyId", v)}
          onBlur={handleBlur}
          placeholder="Leave empty to use default credentials"
        />
        <p className={form.hint}>Optional. If empty, uses AWS default credential chain (env vars, ~/.aws/credentials, IAM roles).</p>
      </div>
      <div className={form.field}>
        <label htmlFor="llm-secret-key">Secret Access Key</label>
        <SecretInput
          id="llm-secret-key"
          value={config.llm.secretAccessKey || ""}
          onChange={(v) => update("secretAccessKey", v)}
          onBlur={handleBlur}
          placeholder="Leave empty to use default credentials"
        />
      </div>
      <div className={form.field}>
        <label htmlFor="llm-model-id">Model ID</label>
        <input
          id="llm-model-id"
          type="text"
          value={config.llm.modelId || ""}
          onChange={(e) => update("modelId", e.target.value)}
          onBlur={handleBlur}
          placeholder="anthropic.claude-3-5-sonnet-20241022-v2:0"
        />
      </div>
    </>
  );
}
