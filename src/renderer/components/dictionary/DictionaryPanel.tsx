import { useState } from "react";
import { useConfigStore } from "../../stores/config-store";
import { useT } from "../../i18n-context";
import card from "../shared/card.module.scss";
import form from "../shared/forms.module.scss";
import buttons from "../shared/buttons.module.scss";
import styles from "./DictionaryPanel.module.scss";

const WHISPER_PROMPT_MAX_CHARS = 896;
const BASE_PROMPT_OVERHEAD = 84; // WHISPER_PROMPT length (82) + separator ". " (2)

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
  const [inputValue, setInputValue] = useState("");
  const [copied, setCopied] = useState(false);

  if (!config) return null;

  const dictionary = config.dictionary ?? [];
  const sorted = [...dictionary].sort((a, b) => a.localeCompare(b));
  const budget = getWhisperTermBudget(dictionary);

  const addTerms = (input: string) => {
    const terms = input
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (terms.length === 0) return;

    const existing = new Set(dictionary.map((t) => t.toLowerCase()));
    const newTerms = terms.filter((t) => !existing.has(t.toLowerCase()));
    if (newTerms.length > 0) {
      updateConfig({ dictionary: [...dictionary, ...newTerms] });
      saveConfig(true);
    }
    setInputValue("");
  };

  const removeTerm = (term: string) => {
    updateConfig({ dictionary: dictionary.filter((t) => t !== term) });
    saveConfig(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTerms(inputValue);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(dictionary.join(", "));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={card.card}>
      <div className={card.header}>
        <h2>{t("dictionary.title")}</h2>
        <p className={card.description}>
          {t("dictionary.description")}
        </p>
      </div>

      {budget.overLimit && (
        <div className={card.warningBanner}>
          {t("dictionary.overLimitWarning", { total: budget.total, fits: budget.fits })}
        </div>
      )}

      <div className={card.body}>
        <div className={styles.addRow}>
          <input
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
            <div className={styles.listHeader}>
              <span className={styles.count}>{sorted.length === 1 ? t("dictionary.oneEntry") : t("dictionary.entries", { count: sorted.length })}</span>
              <button
                onClick={handleCopyToClipboard}
                className={`${buttons.btn} ${buttons.secondary} ${buttons.sm}`}
              >
                {copied ? t("dictionary.copied") : t("dictionary.copyToClipboard")}
              </button>
            </div>
            <div className={styles.entryList}>
              {sorted.map((term) => (
                <div key={term} className={styles.entry}>
                  <span className={styles.entryText}>{term}</span>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => removeTerm(term)}
                    title={t("dictionary.remove")}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
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
