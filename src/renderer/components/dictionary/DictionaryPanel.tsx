import { useState } from "react";
import { useConfigStore } from "../../stores/config-store";
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
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const saveConfig = useConfigStore((s) => s.saveConfig);
  const [inputValue, setInputValue] = useState("");
  const [showImportExport, setShowImportExport] = useState(false);
  const [importValue, setImportValue] = useState("");

  if (!config) return null;

  const dictionary = config.dictionary ?? [];
  const sorted = [...dictionary].sort((a, b) => a.localeCompare(b));
  const budget = getWhisperTermBudget(dictionary);

  const addTerm = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    if (dictionary.some((t) => t.toLowerCase() === trimmed.toLowerCase())) return;
    updateConfig({ dictionary: [...dictionary, trimmed] });
    saveConfig(true);
    setInputValue("");
  };

  const removeTerm = (term: string) => {
    updateConfig({ dictionary: dictionary.filter((t) => t !== term) });
    saveConfig(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTerm(inputValue);
    }
  };

  const handleImport = () => {
    const terms = importValue
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const existing = new Set(dictionary.map((t) => t.toLowerCase()));
    const newTerms = terms.filter((t) => !existing.has(t.toLowerCase()));
    if (newTerms.length > 0) {
      updateConfig({ dictionary: [...dictionary, ...newTerms] });
      saveConfig(true);
    }
    setImportValue("");
  };

  const handleExport = () => {
    navigator.clipboard.writeText(dictionary.join(", "));
  };

  return (
    <div className={card.card}>
      <div className={card.header}>
        <h2>Dictionary</h2>
        <p className={card.description}>
          Add words and phrases to improve transcription accuracy for names, technical terms, and jargon.
        </p>
      </div>

      {budget.overLimit && (
        <div className={card.warningBanner}>
          Your dictionary has {budget.total} entries but only {budget.fits} fit in the speech recognition prompt. All entries will still be used for AI enhancement.
        </div>
      )}

      <div className={card.body}>
        <div className={styles.addRow}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a word or phrase..."
          />
          <button
            onClick={() => addTerm(inputValue)}
            disabled={!inputValue.trim()}
            className={`${buttons.btn} ${buttons.primary}`}
          >
            Add
          </button>
        </div>

        {sorted.length > 0 && (
          <>
            <div className={styles.count}>{sorted.length} {sorted.length === 1 ? "entry" : "entries"}</div>
            <div className={styles.entryList}>
              {sorted.map((term) => (
                <div key={term} className={styles.entry}>
                  <span className={styles.entryText}>{term}</span>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => removeTerm(term)}
                    title="Remove"
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
            No entries yet. Add words like names, technical terms, or acronyms that are often misheard.
          </div>
        )}

        <details
          className={form.exampleDetails}
          open={showImportExport}
          onToggle={(e) => setShowImportExport((e.target as HTMLDetailsElement).open)}
        >
          <summary>Import / Export</summary>
          <div style={{ marginTop: "var(--spacing-3)" }}>
            <div className={styles.addRow}>
              <textarea
                value={importValue}
                onChange={(e) => setImportValue(e.target.value)}
                placeholder="Paste comma-separated terms..."
                rows={3}
                className={form.monospaceTextarea}
                style={{ resize: "none", marginTop: 0 }}
              />
            </div>
            <div style={{ display: "flex", gap: "var(--spacing-2)" }}>
              <button
                onClick={handleImport}
                disabled={!importValue.trim()}
                className={`${buttons.btn} ${buttons.primary} ${buttons.sm}`}
              >
                Import
              </button>
              <button
                onClick={handleExport}
                disabled={dictionary.length === 0}
                className={`${buttons.btn} ${buttons.secondary} ${buttons.sm}`}
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
