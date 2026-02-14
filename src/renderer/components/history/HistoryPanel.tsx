import { useEffect, useRef, useCallback, useState } from "react";
import { useHistoryStore } from "../../stores/history-store";
import { useT } from "../../i18n-context";
import type { TranscriptionEntry } from "../../../shared/types";
import card from "../shared/card.module.scss";
import styles from "./HistoryPanel.module.scss";

const DEBOUNCE_MS = 300;

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatDuration(ms: number): string {
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}

function formatDateGroup(timestamp: string, t: (key: string) => string): string {
  const date = new Date(timestamp);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) return t("history.today");

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return t("history.yesterday");

  return date.toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

function groupByDate(entries: TranscriptionEntry[], t: (key: string) => string): Map<string, TranscriptionEntry[]> {
  const groups = new Map<string, TranscriptionEntry[]>();
  for (const entry of entries) {
    const key = formatDateGroup(entry.timestamp, t);
    const group = groups.get(key) ?? [];
    group.push(entry);
    groups.set(key, group);
  }
  return groups;
}

function CopyButton({ text, t }: { text: string; t: (key: string) => string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await window.voxApi.clipboard.write(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button className={styles.copyButton} onClick={handleCopy} title={t("history.copyToClipboard")}>
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
      <span>{copied ? t("history.copied") : t("history.copy")}</span>
    </button>
  );
}

export function HistoryPanel() {
  const t = useT();
  const entries = useHistoryStore((s) => s.entries);
  const total = useHistoryStore((s) => s.total);
  const page = useHistoryStore((s) => s.page);
  const pageSize = useHistoryStore((s) => s.pageSize);
  const loading = useHistoryStore((s) => s.loading);
  const searchQuery = useHistoryStore((s) => s.searchQuery);
  const fetchPage = useHistoryStore((s) => s.fetchPage);
  const setPage = useHistoryStore((s) => s.setPage);
  const setPageSize = useHistoryStore((s) => s.setPageSize);
  const search = useHistoryStore((s) => s.search);
  const deleteEntry = useHistoryStore((s) => s.deleteEntry);
  const clearHistory = useHistoryStore((s) => s.clearHistory);
  const reset = useHistoryStore((s) => s.reset);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const totalPages = Math.ceil(total / pageSize);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    reset();
    fetchPage();
  }, [reset, fetchPage]);

  useEffect(() => {
    window.voxApi.history.onEntryAdded(() => {
      reset();
      fetchPage();
    });
  }, [reset, fetchPage]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        search(value);
      }, DEBOUNCE_MS);
    },
    [search],
  );

  const handleClear = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    await clearHistory();
    setConfirmClear(false);
  };

  const groups = groupByDate(entries, t);

  return (
    <>
      <div className={card.card}>
        <div className={card.header}>
          <h2>{t("history.title")}</h2>
          <p className={card.description}>
            {total > 0 ? (total === 1 ? t("history.oneStored") : t("history.countStored", { count: total })) : t("history.emptyState")}
          </p>
        </div>
        <div className={card.body}>
          <div className={styles.searchContainer}>
            <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              placeholder={t("history.searchPlaceholder")}
              defaultValue={searchQuery}
              onChange={handleSearchChange}
              className={styles.searchInput}
            />
          </div>

          {entries.length === 0 && !loading ? (
            <div className={styles.emptyState}>
              {searchQuery ? t("history.noSearchResults") : t("history.noTranscriptions")}
            </div>
          ) : (
            <div className={styles.entryList}>
              {Array.from(groups.entries()).map(([dateLabel, groupEntries]) => (
                <div key={dateLabel} className={styles.dateGroup}>
                  <div className={styles.dateHeader}>{dateLabel}</div>
                  {groupEntries.map((entry) => (
                    <div key={entry.id} className={styles.entry}>
                      <div className={styles.entryContent}>
                        <p className={styles.entryText}>{entry.text}</p>
                        <div className={styles.entryMeta}>
                          <span>{formatTime(entry.timestamp)}</span>
                          <span>{t("history.words", { count: entry.wordCount })}</span>
                          <span>{formatDuration(entry.audioDurationMs)}</span>
                          <span>{entry.whisperModel}</span>
                          {entry.llmEnhanced && entry.llmProvider && (
                            <span className={styles.badge}>{entry.llmProvider}</span>
                          )}
                        </div>
                      </div>
                      <div className={styles.entryActions}>
                        <CopyButton text={entry.text} t={t} />
                        <button
                          className={styles.deleteButton}
                          onClick={() => deleteEntry(entry.id)}
                          title={t("history.deleteTranscription")}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {loading && <div className={styles.spinner}>{t("history.loading")}</div>}

          {total > 0 && (
            <div className={styles.pagination}>
              <div className={styles.pageInfo}>
                {/* eslint-disable-next-line i18next/no-literal-string */}
                {page} / {totalPages || 1}
              </div>
              <div className={styles.pageControls}>
                <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              </div>
              {/* eslint-disable i18next/no-literal-string */}
              <select className={styles.pageSizeSelect} value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
              {/* eslint-enable i18next/no-literal-string */}
            </div>
          )}
        </div>
      </div>

      {total > 0 && (
        <div className={card.card}>
          <div className={card.body}>
            <button
              className={`${styles.clearButton} ${confirmClear ? styles.confirmClear : ""}`}
              onClick={handleClear}
              onBlur={() => setConfirmClear(false)}
            >
              {confirmClear ? t("history.confirmClear") : t("history.clearHistory")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
