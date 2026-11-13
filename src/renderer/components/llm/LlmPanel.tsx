import { useState, useCallback, useRef, useEffect } from "react";
import { useConfigStore } from "../../stores/config-store";
import { Tabs } from "../../../shared/tabs";
import { useDevOverrideValue } from "../../hooks/use-dev-override";
import { useDebouncedSave } from "../../hooks/use-debounced-save";
import { useInlineConfirm } from "../../hooks/use-inline-confirm";
import { useOutsideMousedown } from "../../hooks/use-outside-mousedown";
import { useT } from "../../i18n-context";
import { FoundryFields } from "./FoundryFields";
import { BedrockFields } from "./BedrockFields";
import { OpenAICompatibleFields } from "./OpenAICompatibleFields";
import { LiteLLMFields } from "./LiteLLMFields";
import { AnthropicFields } from "./AnthropicFields";
import { CustomProviderFields } from "./CustomProviderFields";
import { StatusBox } from "../ui/StatusBox";
import { NewDot } from "../ui/NewDot";
import { CustomSelect } from "../ui/CustomSelect";
import { ExternalLinkIcon, CheckCircleIcon, InfoCircleAltIcon, CopyIcon, SparkleIcon, PlayIcon } from "../../../shared/icons";
import type { LlmProviderType, LlmConfig, Prompt } from "../../../shared/config";
import { computeLlmConfigHash } from "../../../shared/llm-config-hash";
import { findActivePrompt } from "../../../shared/prompts";
import { PROMPT_TEMPLATES } from "../../../shared/prompt-templates";
import card from "../shared/card.module.scss";
import form from "../shared/forms.module.scss";
import buttons from "../shared/buttons.module.scss";
import styles from "./LlmPanel.module.scss";

export function isProviderConfigured(provider: LlmProviderType, llm: LlmConfig): boolean {
  if (provider !== llm.provider) return false;
  switch (llm.provider) {
    case "foundry":
      return !!(llm.endpoint && llm.apiKey && llm.model);
    case "bedrock":
      return !!(llm.region && llm.modelId && (llm.profile || (llm.accessKeyId && llm.secretAccessKey)));
    case "openai":
    case "deepseek":
    case "glm":
      return !!(llm.openaiApiKey && llm.openaiModel && llm.openaiEndpoint);
    case "litellm":
      return !!(llm.openaiEndpoint && llm.openaiModel);
    case "anthropic":
      return !!(llm.anthropicApiKey && llm.anthropicModel && llm.anthropicEndpoint);
    case "custom":
      return !!(llm.customEndpoint && llm.customToken && llm.customTokenAttr);
    default:
      return false;
  }
}

export function LlmPanel() {
  const t = useT();
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const saveConfig = useConfigStore((s) => s.saveConfig);
  const realSetupComplete = useConfigStore((s) => s.setupComplete);
  const { debouncedSave, flush } = useDebouncedSave(500, true);
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<{ text: string; type: "info" | "success" | "error" }>({ text: "", type: "info" });
  const llmSubTab = useConfigStore((s) => s.llmSubTab);
  const setLlmSubTab = useConfigStore((s) => s.setLlmSubTab);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(() => config?.activePromptId ?? null);
  // Field values of the selected prompt as typed, re-applied by id when a config reload drops unsaved typing.
  const [draft, setDraft] = useState<Prompt | null>(null);
  const hasUnsavedEdit = useRef(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const templateMenuRef = useRef<HTMLDivElement>(null);
  const closeTemplates = useCallback(() => setTemplatesOpen(false), []);
  useOutsideMousedown(templatesOpen, templateMenuRef, closeTemplates);
  // deleteSelectedPrompt is declared after the early returns; it runs only on the confirming click.
  const {
    confirming: confirmingDelete,
    buttonRef: confirmBtnRef,
    handleClick: handleDeleteClick,
    cancel: cancelDelete,
  } = useInlineConfirm(() => deleteSelectedPrompt());
  const [visitedCustomPrompt, setVisitedCustomPrompt] = useState(() => localStorage.getItem("vox:visited-custom-prompt") === "true");
  const [copiedExample, setCopiedExample] = useState<string | null>(null);
  const [hasPickedProvider, setHasPickedProvider] = useState(false);
  const testSectionRef = useRef<HTMLDivElement>(null);

  const configHash = config ? computeLlmConfigHash(config) : "";
  const prevHashRef = useRef(configHash);
  useEffect(() => {
    if (prevHashRef.current && prevHashRef.current !== configHash) {
      setTestStatus({ text: "", type: "info" });
    }
    prevHashRef.current = configHash;
  }, [configHash]);

  const toSavedPrompt = useCallback(
    (prompt: Prompt): Prompt => ({ ...prompt, name: prompt.name.trim() || t("llm.prompts.untitled") }),
    [t],
  );

  useEffect(() => {
    if (!config || !draft) return;
    const stored = config.prompts.find((prompt) => prompt.id === draft.id);
    const pending = toSavedPrompt(draft);
    if (stored && (stored.name !== pending.name || stored.icon !== pending.icon || stored.instructions !== pending.instructions)) {
      updateConfig({ prompts: config.prompts.map((prompt) => (prompt.id === pending.id ? pending : prompt)) });
    }
  }, [config, draft, toSavedPrompt, updateConfig]);

  // Dev overrides (gated — tree-shaken in production)
  const setupComplete = import.meta.env.DEV
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useDevOverrideValue("setupComplete", realSetupComplete)
    : realSetupComplete;

  const devLlmEnhancement = import.meta.env.DEV
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useDevOverrideValue("llmEnhancementEnabled", undefined)
    : undefined;

  const devLlmTested = import.meta.env.DEV
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useDevOverrideValue("llmConnectionTested", undefined)
    : undefined;

  const devLlmConfigured = import.meta.env.DEV
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useDevOverrideValue("llmProviderConfigured", undefined)
    : undefined;

  const handlePromptTabClick = useCallback(() => {
    if (!visitedCustomPrompt) {
      setVisitedCustomPrompt(true);
      localStorage.setItem("vox:visited-custom-prompt", "true");
    }
    setLlmSubTab("prompt");
  }, [visitedCustomPrompt, setLlmSubTab]);

  if (!config) return null;

  const effectiveEnhancement = devLlmEnhancement ?? config.enableLlmEnhancement;
  const effectiveTested = devLlmTested ?? config.llmConnectionTested;

  const needsTest = effectiveEnhancement
    && (!effectiveTested || computeLlmConfigHash(config) !== config.llmConfigHash);

  const providerConfigured = devLlmConfigured ?? isProviderConfigured(config.llm.provider, config.llm);
  const providerEverTested = effectiveTested || config.llmConfigHash !== "";
  const showPlaceholder = devLlmConfigured === false
    || (!hasPickedProvider && !providerConfigured && !providerEverTested);

  if (!setupComplete) {
    return (
      <div className={card.card}>
        <div className={card.header}>
          <h2>{t("llm.setupTitle")}</h2>
          <p className={card.description}>
            {t("llm.setupDescription")}
          </p>
        </div>
        <div className={card.warningBanner}>
          <span>
            {t("llm.setupRequired")}{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                useConfigStore.getState().setActiveTab(Tabs.SPEECH);
              }}
              style={{ color: "inherit", textDecoration: "underline", cursor: "pointer" }}
            >
              {t("llm.setupLocalModel")}
            </a>
            {" "}{t("llm.setupSuffix")}
          </span>
        </div>
      </div>
    );
  }

  const handleProviderChange = async (value: string) => {
    if (value === "") return;
    const provider = value as LlmProviderType;
    setHasPickedProvider(true);
    if (provider === config.llm.provider && !showPlaceholder) return;
    const newLlm = await window.voxApi.config.loadLlmForProvider(provider);
    updateConfig({ llm: newLlm, llmConnectionTested: false, llmConfigHash: "" });
    saveConfig(true);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestStatus({ text: t("llm.testingConnection"), type: "info" });

    try {
      const result = await window.voxApi.llm.test(config);
      const freshConfig = await window.voxApi.config.load();
      updateConfig({
        llmConnectionTested: freshConfig.llmConnectionTested,
        llmConfigHash: freshConfig.llmConfigHash,
      });
      if (result.ok) {
        setTestStatus({ text: t("llm.connectionSuccessful"), type: "success" });
      } else {
        setTestStatus({ text: t("llm.connectionFailed", { error: result.error ?? "" }), type: "error" });
      }
    } catch (err: unknown) {
      setTestStatus({ text: t("llm.connectionFailed", { error: err instanceof Error ? err.message : String(err) }), type: "error" });
    } finally {
      setTesting(false);
      testSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  };

  const activePromptId = findActivePrompt(config)?.id ?? null;
  const selectedPrompt = config.prompts.find((prompt) => prompt.id === selectedPromptId) ?? null;
  // A selected id that is no longer in the list shows the None row.
  const shownPromptId = selectedPrompt?.id ?? null;
  const editorValues = draft && draft.id === shownPromptId ? draft : selectedPrompt;

  const selectPrompt = (id: string | null) => {
    cancelDelete();
    setDraft(null);
    setSelectedPromptId(id);
  };

  const addPrompt = (prompt: Omit<Prompt, "id">) => {
    const created = { id: crypto.randomUUID(), ...prompt };
    updateConfig({ prompts: [...config.prompts, created] });
    setTemplatesOpen(false);
    selectPrompt(created.id);
    saveConfig(true);
  };

  const editSelectedPrompt = (changes: Partial<Omit<Prompt, "id">>) => {
    if (!editorValues) return;
    const edited = { ...editorValues, ...changes };
    setDraft(edited);
    const saved = toSavedPrompt(edited);
    updateConfig({ prompts: config.prompts.map((prompt) => (prompt.id === saved.id ? saved : prompt)) });
    hasUnsavedEdit.current = true;
    debouncedSave();
  };

  const flushPromptEdit = () => {
    if (!hasUnsavedEdit.current) return;
    hasUnsavedEdit.current = false;
    flush();
  };

  const deleteSelectedPrompt = async () => {
    if (!selectedPrompt) return;
    updateConfig({ prompts: config.prompts.filter((prompt) => prompt.id !== selectedPrompt.id) });
    selectPrompt(null);
    await saveConfig(true);
    if (selectedPrompt.id === activePromptId) {
      await window.voxApi.prompts.setActive(null);
    }
  };

  const selectedIsActive = shownPromptId === activePromptId;
  const makeActiveButton = (
    <button
      type="button"
      onClick={() => window.voxApi.prompts.setActive(shownPromptId)}
      disabled={selectedIsActive}
      className={`${buttons.btn} ${buttons.primary} ${buttons.sm}`}
    >
      {selectedIsActive ? t("llm.prompts.active") : t("llm.prompts.makeActive")}
    </button>
  );

  return (
    <div className={card.card}>
      <div className={card.header}>
        <h2>{t("llm.title")} <span className={card.titleSuffix}>{t("llm.titleSuffix")}</span></h2>
        <p className={card.description}>
          {t("llm.description")}
        </p>
        <button
          type="button"
          onClick={() => window.voxApi.shell.openExternal("https://github.com/app-vox/vox?tab=readme-ov-file#configuration")}
          className={card.learnMore}
        >
          {t("llm.learnMore")}
          <ExternalLinkIcon width={12} height={12} />
        </button>
      </div>
      <div className={card.body}>
        <div
          className={`${styles.enhanceToggle} ${effectiveEnhancement ? styles.active : ""}`}
          role="switch"
          aria-checked={effectiveEnhancement ?? false}
          tabIndex={0}
          onClick={() => {
            updateConfig({ enableLlmEnhancement: !config.enableLlmEnhancement });
            saveConfig(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              updateConfig({ enableLlmEnhancement: !config.enableLlmEnhancement });
              saveConfig(true);
            }
          }}
        >
          <div className={styles.enhanceIcon}>
            <SparkleIcon width={18} height={18} />
          </div>
          <div className={styles.enhanceText}>
            <div className={styles.enhanceTitle}>{t("llm.enableCheckbox")}</div>
            <div className={styles.enhanceDesc}>{t("llm.enableHint")}</div>
          </div>
          <div className={`${styles.toggle} ${effectiveEnhancement ? styles.toggleOn : ""}`} />
        </div>

        {effectiveEnhancement && (
          <>
            {needsTest && (
              <div className={card.warningBannerInline}>
                {t("llm.connectionTestRequired")}
              </div>
            )}

            <div className={form.inlineTabs}>
              <button
                onClick={() => setLlmSubTab("provider")}
                className={`${form.inlineTab} ${llmSubTab === "provider" ? form.active : ""}`}
              >
                {t("llm.providerTab")}
              </button>
              <button
                onClick={handlePromptTabClick}
                className={`${form.inlineTab} ${llmSubTab === "prompt" ? form.active : ""}`}
              >
                {t("llm.customPromptTab")}
                {!visitedCustomPrompt && <NewDot />}
              </button>
            </div>

            {llmSubTab === "provider" && (
              <>
                <div className={form.field}>
                  <label htmlFor="llm-provider">{t("llm.providerLabel")}</label>
                  <CustomSelect
                    id="llm-provider"
                    value={showPlaceholder ? "" : (config.llm.provider || "foundry")}
                    items={[
                      ...(showPlaceholder ? [{ value: "", label: t("llm.selectProvider") }] : []),
                      ...([
                        { value: "foundry", label: "Microsoft Foundry" },
                        { value: "bedrock", label: "AWS Bedrock" },
                        { value: "openai", label: "OpenAI" },
                        { value: "deepseek", label: "DeepSeek" },
                        { value: "glm", label: "GLM (Zhipu AI)" },
                        { value: "anthropic", label: "Anthropic" },
                        { value: "litellm", label: "LiteLLM" },
                        { value: "custom", label: t("llm.custom.label") },
                      ] as const).map((item) => ({
                        ...item,
                        suffix: isProviderConfigured(item.value, config.llm)
                          ? <CheckCircleIcon width={14} height={14} style={{ color: "var(--color-accent)" }} />
                          : undefined,
                      })),
                    ]}
                    onChange={handleProviderChange}
                  />
                </div>

                {!showPlaceholder && (
                  <>
                    {config.llm.provider === "litellm" ? (
                      <LiteLLMFields />
                    ) : (config.llm.provider === "openai" || config.llm.provider === "deepseek" || config.llm.provider === "glm") ? (
                      <OpenAICompatibleFields providerType={config.llm.provider} />
                    ) : config.llm.provider === "bedrock" ? (
                      <BedrockFields />
                    ) : config.llm.provider === "anthropic" ? (
                      <AnthropicFields />
                    ) : config.llm.provider === "custom" ? (
                      <CustomProviderFields />
                    ) : (
                      <FoundryFields />
                    )}
                  </>
                )}

                <div className={form.testSection} ref={testSectionRef}>
                  <button
                    onClick={handleTest}
                    disabled={testing || showPlaceholder}
                    className={`${buttons.btn} ${buttons.primary}`}
                  >
                    <PlayIcon width={14} height={14} />
                    {t("llm.testConnection")}
                  </button>
                  {!showPlaceholder && <StatusBox text={testStatus.text} type={testStatus.type} />}
                </div>
              </>
            )}

            {llmSubTab === "prompt" && (
              <div className={styles.promptManager}>
                <div>
                  <ul aria-label={t("llm.prompts.listLabel")} className={styles.promptRows}>
                    {[{ id: null, icon: "", name: t("llm.prompts.none") }, ...config.prompts].map((prompt) => (
                      <li key={prompt.id ?? "none"}>
                        <button
                          type="button"
                          aria-current={prompt.id === shownPromptId ? "true" : undefined}
                          onClick={() => selectPrompt(prompt.id)}
                          className={`${styles.promptRow} ${prompt.id === shownPromptId ? styles.selected : ""}`}
                        >
                          <span className={styles.promptIcon}>{prompt.icon}</span>
                          <span className={styles.promptName}>{prompt.name}</span>
                          {prompt.id === activePromptId && (
                            <span role="img" aria-label={t("llm.prompts.active")} className={styles.activeDot} />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className={styles.promptListActions}>
                    <button
                      type="button"
                      onClick={() => addPrompt({ name: t("llm.prompts.newName"), icon: "📝", instructions: "" })}
                      className={`${buttons.btn} ${buttons.secondary} ${buttons.sm}`}
                    >
                      {/* eslint-disable-next-line i18next/no-literal-string -- decorative symbol */}
                      <span aria-hidden="true">+</span>
                      {t("llm.prompts.new")}
                    </button>
                    <div
                      ref={templateMenuRef}
                      className={styles.templateMenuAnchor}
                      onKeyDown={(e) => { if (e.key === "Escape") closeTemplates(); }}
                    >
                      <button
                        type="button"
                        aria-haspopup="menu"
                        aria-expanded={templatesOpen}
                        onClick={() => setTemplatesOpen((open) => !open)}
                        className={`${buttons.btn} ${buttons.secondary} ${buttons.sm}`}
                      >
                        {t("llm.prompts.fromTemplate")}
                      </button>
                      {templatesOpen && (
                        <div role="menu" className={styles.templateMenu}>
                          {PROMPT_TEMPLATES.map((template) => (
                            <button
                              key={template.id}
                              type="button"
                              role="menuitem"
                              onClick={() => addPrompt({ name: t(template.nameKey), icon: template.icon, instructions: template.instructions })}
                              className={styles.templateItem}
                            >
                              <span className={styles.promptIcon}>{template.icon}</span>
                              {t(template.nameKey)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className={styles.promptEditor}>
                  {editorValues ? (
                    <>
                      <div className={form.fieldRow}>
                        <div className={`${form.field} ${styles.iconField}`}>
                          <label htmlFor="prompt-icon">{t("llm.prompts.icon")}</label>
                          <input
                            id="prompt-icon"
                            type="text"
                            value={editorValues.icon}
                            onChange={(e) => {
                              const graphemes = [...new Intl.Segmenter().segment(e.target.value)];
                              editSelectedPrompt({ icon: graphemes.at(-1)?.segment ?? "" });
                            }}
                            onBlur={flushPromptEdit}
                          />
                        </div>
                        <div className={`${form.field} ${styles.nameField}`}>
                          <label htmlFor="prompt-name">{t("llm.prompts.name")}</label>
                          <input
                            id="prompt-name"
                            type="text"
                            value={editorValues.name}
                            placeholder={t("llm.prompts.untitled")}
                            onChange={(e) => editSelectedPrompt({ name: e.target.value })}
                            onBlur={flushPromptEdit}
                          />
                        </div>
                      </div>
                      <div className={form.field}>
                        <label htmlFor="custom-prompt">{t("llm.customInstructions")}</label>
                        <p className={form.hint}>
                          {t("llm.customInstructionsHint")}
                        </p>
                        <textarea
                          id="custom-prompt"
                          value={editorValues.instructions}
                          onChange={(e) => editSelectedPrompt({ instructions: e.target.value })}
                          onBlur={flushPromptEdit}
                          placeholder={t("llm.customInstructionsPlaceholder")}
                          rows={12}
                          className={form.monospaceTextarea}
                          style={{ resize: "none" }}
                        />
                        <details className={form.exampleDetails}>
                          <summary>
                            <InfoCircleAltIcon width={13} height={13} />
                            {t("llm.exampleInstructions")}
                          </summary>
                          <ul>
                            {([
                              { label: t("llm.exampleProfessionalLabel"), text: t("llm.exampleProfessional"), key: "professional" },
                              { label: t("llm.exampleFormalLabel"), text: t("llm.exampleFormal"), key: "formal" },
                              { label: t("llm.exampleCasualLabel"), text: t("llm.exampleCasual"), key: "casual" },
                              { label: t("llm.exampleFunnyLabel"), text: t("llm.exampleFunny"), key: "funny" },
                              { label: t("llm.exampleEmojisLabel"), text: t("llm.exampleEmojis"), key: "emojis" },
                              { label: t("llm.exampleConciseLabel"), text: t("llm.exampleConcise"), key: "concise" },
                              { label: t("llm.exampleLanguageLabel"), text: t("llm.exampleLanguage"), key: "language" },
                            ]).map((ex) => (
                              <li key={ex.key} className={form.exampleItem}>
                                <span><strong>{ex.label}</strong> {ex.text}</span>
                                <button
                                  type="button"
                                  className={form.exampleCopyBtn}
                                  title={copiedExample === ex.key ? t("history.copied") : t("history.copy")}
                                  onClick={() => {
                                    const clean = ex.text.replace(/^[""\u201C]|[""\u201D]$/g, "");
                                    window.voxApi.clipboard.write(clean);
                                    setCopiedExample(ex.key);
                                    setTimeout(() => setCopiedExample((prev) => prev === ex.key ? null : prev), 1500);
                                  }}
                                >
                                  {copiedExample === ex.key
                                    ? <CheckCircleIcon width={12} height={12} />
                                    : <CopyIcon width={12} height={12} />
                                  }
                                </button>
                              </li>
                            ))}
                          </ul>
                        </details>
                      </div>
                      <div className={styles.editorActions}>
                        {makeActiveButton}
                        {confirmingDelete ? (
                          <button ref={confirmBtnRef} type="button" onClick={handleDeleteClick} className={`${buttons.btn} ${buttons.sm} ${styles.confirmDelete}`}>
                            {t("model.confirmDelete")}
                          </button>
                        ) : (
                          <button type="button" onClick={handleDeleteClick} className={`${buttons.btn} ${buttons.secondary} ${buttons.sm}`}>
                            {t("llm.prompts.delete")}
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className={form.hint}>{t("llm.prompts.noneHint")}</p>
                      <div className={styles.editorActions}>{makeActiveButton}</div>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
