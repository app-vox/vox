import { useState, useRef, useEffect } from "react";
import { useConfigStore } from "../../stores/config-store";
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
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const saveConfig = useConfigStore((s) => s.saveConfig);
  const [inputValue, setInputValue] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  if (!config) return null;

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
      updateConfig({ dictionary: [...dictionary, ...newTerms] });
      saveConfig(true);
      setPage(1);
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
    setPageSize(size);
    setPage(1);
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
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a word or phrase..."
          />
          <button
            onClick={() => addTerms(inputValue)}
            disabled={!inputValue.trim()}
            className={`${buttons.btn} ${buttons.primary}`}
          >
            Add
          </button>
        </div>
        <p className={form.hint}>
          Use commas to add multiple terms at once, e.g. "John, Project Alpha, Zoom"
        </p>

        {sorted.length > 0 && (
          <>
            <div className={styles.listHeader}>
              <span className={styles.count}>{sorted.length} {sorted.length === 1 ? "entry" : "entries"}</span>
            </div>
            <div className={styles.entryList}>
              {pageEntries.map((term) => (
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

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <div className={styles.pageInfo}>
                  Page {page} of {totalPages}
                </div>
                <div className={styles.pageControls}>
                  <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
                  <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
                </div>
                <select value={pageSize} onChange={(e) => handlePageSizeChange(Number(e.target.value))}>
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>
            )}
          </>
        )}

        {sorted.length === 0 && (
          <div className={styles.emptyState}>
            No entries yet. Add names, places, or any words that are often misheard during transcription.
          </div>
        )}
      </div>
    </div>
  );
}
