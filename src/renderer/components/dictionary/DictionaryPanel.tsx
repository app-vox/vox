import { useState, useRef, useEffect } from "react";
import { useConfigStore } from "../../stores/config-store";
import { useDevOverrideValue } from "../../hooks/use-dev-override";
import { useT } from "../../i18n-context";
import { computeLlmConfigHash } from "../../../shared/llm-config-hash";
import { XIcon, ChevronLeftIcon, ChevronRightIcon, InfoCircleIcon } from "../../../shared/icons";
import { CustomSelect } from "../ui/CustomSelect";
import card from "../shared/card.module.scss";
import form from "../shared/forms.module.scss";
import buttons from "../shared/buttons.module.scss";
import styles from "./DictionaryPanel.module.scss";

const WHISPER_PROMPT_MAX_CHARS = 896;
const BASE_PROMPT_OVERHEAD = 84;

function getWhisperTermBudget(dictionary: string[]): { fits: number; total: number; overLimit: boolean } {
  const total = dictionary.length;
  if (total === 0) return { fits: 0, total: 0, overLimit: false };

  const available = WHISPER_PROMPT_MAX_CHARS - BASE_PROMPT_OVERHEAD;
  let charCount = 0;
  let fits = 0;

  for (const term of dictionary) {
    const addition = fits === 0 ? term.length : term.length + 2;
    if (charCount + addition > available) break;
    charCount += addition;
    fits++;
  }

  return { fits, total, overLimit: fits < total };
}

export function DictionaryPanel() {
  const t = useT();
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const saveConfig = useConfigStore((s) => s.saveConfig);
  const setActiveTab = useConfigStore((s) => s.setActiveTab);
  const realSetupComplete = useConfigStore((s) => s.setupComplete);
  const realLlmEnabled = useConfigStore((s) => s.config?.enableLlmEnhancement ?? false);

  const setupComplete = import.meta.env.DEV
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useDevOverrideValue("setupComplete", realSetupComplete)
    : realSetupComplete;

  const llmEnabled = import.meta.env.DEV
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useDevOverrideValue("llmEnhancementEnabled", realLlmEnabled)
    : realLlmEnabled;

  const showInfoBanner = !setupComplete || !llmEnabled;

  const [inputValue, setInputValue] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => Number(localStorage.getItem("vox:dictionary-pageSize")) || 10);
  const [highlightTerms, setHighlightTerms] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  if (!config) return null;

  const llmReady = config.enableLlmEnhancement === true
    && config.llmConnectionTested === true
    && computeLlmConfigHash(config) === config.llmConfigHash;

  const dictionary = config.dictionary ?? [];
  const sorted = [...dictionary].sort((a, b) => a.localeCompare(b));
  const budget = getWhisperTermBudget(dictionary);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const pageEntries = sorted.slice((page - 1) * pageSize, page * pageSize);

  const addTerms = (input: string) => {
    const terms = input
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (terms.length === 0) return;

    const existing = new Set(dictionary.map((t) => t.toLowerCase()));
    const newTerms = terms.filter((t) => !existing.has(t.toLowerCase()));
    if (newTerms.length > 0) {
      const updated = [...dictionary, ...newTerms];
      updateConfig({ dictionary: updated });
      saveConfig(true);

      const newSorted = [...updated].sort((a, b) => a.localeCompare(b));
      const firstNewIndex = newSorted.findIndex((t) => newTerms.includes(t));
      const targetPage = firstNewIndex >= 0 ? Math.floor(firstNewIndex / pageSize) + 1 : 1;
      setPage(targetPage);

      setHighlightTerms(new Set(newTerms));
      setTimeout(() => setHighlightTerms(new Set()), 2000);
    }
    setInputValue("");
  };

  const removeTerm = (term: string) => {
    updateConfig({ dictionary: dictionary.filter((t) => t !== term) });
    saveConfig(true);
    const newTotal = dictionary.length - 1;
    const newTotalPages = Math.ceil(newTotal / pageSize);
    if (page > newTotalPages && newTotalPages > 0) setPage(newTotalPages);
    if (newTotal === 0) setPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTerms(inputValue);
    }
  };

  const handlePageSizeChange = (size: number) => {
    localStorage.setItem("vox:dictionary-pageSize", String(size));
    setPageSize(size);
    setPage(1);
  };

  return (
    <div className={card.card}>
      <div className={card.header}>
        <h2>{t("dictionary.title")}</h2>
        <p className={card.description}>
          {t("dictionary.description")}
        </p>
      </div>

      {showInfoBanner && (
        <div className={card.infoBanner}>
          <InfoCircleIcon width={16} height={16} />
          <span>
            {!setupComplete
              ? t("dictionary.speechRequiredInfo")
              : t("dictionary.llmRequiredInfo")
            }
            {" "}
            {setupComplete && (
              <button className={card.infoBannerLink} onClick={() => setActiveTab("llm")}>
                {t("dictionary.goToAiEnhancement")}
              </button>
            )}
            {!setupComplete && (
              <button className={card.infoBannerLink} onClick={() => setActiveTab("whisper")}>
                {t("dictionary.goToSpeech")}
              </button>
            )}
          </span>
        </div>
      )}

      {llmEnabled && !llmReady && (
        <div className={card.warningBanner}>
          <span>
            {t("dictionary.llmRequired")}{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                useConfigStore.getState().setActiveTab("llm");
              }}
              style={{ color: "inherit", textDecoration: "underline", cursor: "pointer" }}
            >
              {t("tabs.aiEnhancement")}
            </a>
          </span>
        </div>
      )}

      {budget.overLimit && (
        <div className={card.warningBanner}>
          {t("dictionary.overLimitWarning", { total: budget.total, fits: budget.fits })}
        </div>
      )}

      <div className={card.body}>
        <div className={styles.addRow}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("dictionary.placeholder")}
          />
          <button
            onClick={() => addTerms(inputValue)}
            disabled={!inputValue.trim()}
            className={`${buttons.btn} ${buttons.primary}`}
          >
            {t("dictionary.add")}
          </button>
        </div>
        <p className={form.hint}>
          {t("dictionary.hint")}
        </p>

        {sorted.length > 0 && (
          <>
            <div className={styles.entryList}>
              {pageEntries.map((term) => (
                <div key={term} className={`${styles.entry} ${highlightTerms.has(term) ? styles.highlight : ""}`}>
                  <span className={styles.entryText}>{term}</span>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => removeTerm(term)}
                    title={t("dictionary.remove")}
                  >
                    <XIcon width={14} height={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className={styles.listHeader}>
              <span className={styles.count}>{sorted.length === 1 ? t("dictionary.oneEntry") : t("dictionary.entries", { count: sorted.length })}</span>
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <div className={styles.pageInfo}>
                  {/* eslint-disable-next-line i18next/no-literal-string */}
                  {page} / {totalPages || 1}
                </div>
                <div className={styles.pageControls}>
                  <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    <ChevronLeftIcon width={12} height={12} />
                  </button>
                  <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                    <ChevronRightIcon width={12} height={12} />
                  </button>
                </div>
                {/* eslint-disable i18next/no-literal-string */}
                <div className={styles.pageSizeSelect}>
                  <CustomSelect
                    value={String(pageSize)}
                    items={[
                      { value: "10", label: "10 / page" },
                      { value: "25", label: "25 / page" },
                      { value: "50", label: "50 / page" },
                    ]}
                    onChange={(value) => handlePageSizeChange(Number(value))}
                  />
                </div>
                {/* eslint-enable i18next/no-literal-string */}
              </div>
            )}
          </>
        )}

        {sorted.length === 0 && (
          <div className={styles.emptyState}>
            {t("dictionary.emptyState")}
          </div>
        )}
      </div>
    </div>
  );
}
