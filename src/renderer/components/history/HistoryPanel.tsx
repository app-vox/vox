import { useEffect, useRef, useCallback, useState } from "react";
import { useHistoryStore } from "../../stores/history-store";
import type { TranscriptionEntry } from "../../../shared/types";
import card from "../shared/card.module.scss";
import styles from "./HistoryPanel.module.scss";

const DEBOUNCE_MS = 300;

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDateGroup(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString([], { month: "long", day: "numeric" });
}

function groupByDate(entries: TranscriptionEntry[]): Map<string, TranscriptionEntry[]> {
  const groups = new Map<string, TranscriptionEntry[]>();
  for (const entry of entries) {
    const key = formatDateGroup(entry.timestamp);
    const group = groups.get(key) ?? [];
    group.push(entry);
    groups.set(key, group);
  }
  return groups;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button className={styles.copyButton} onClick={handleCopy} title="Copy to clipboard">
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
      <span>{copied ? "Copied!" : "Copy"}</span>
    </button>
  );
}

export function HistoryPanel() {
  const entries = useHistoryStore((s) => s.entries);
  const total = useHistoryStore((s) => s.total);
  const loading = useHistoryStore((s) => s.loading);
  const hasMore = useHistoryStore((s) => s.hasMore);
  const searchQuery = useHistoryStore((s) => s.searchQuery);
  const fetchPage = useHistoryStore((s) => s.fetchPage);
  const search = useHistoryStore((s) => s.search);
  const clearHistory = useHistoryStore((s) => s.clearHistory);
  const reset = useHistoryStore((s) => s.reset);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  // Load initial page on mount
  useEffect(() => {
    reset();
    fetchPage();
  }, [reset, fetchPage]);

  // Auto-refresh when a new transcription is added
  useEffect(() => {
    window.voxApi.history.onEntryAdded(() => {
      reset();
      fetchPage();
    });
  }, [reset, fetchPage]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const scrollRoot = sentinel.closest(".content");
    const observer = new IntersectionObserver(
      (intersections) => {
        if (intersections[0].isIntersecting && hasMore && !loading) {
          fetchPage();
        }
      },
      { root: scrollRoot, threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, fetchPage]);

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

  const groups = groupByDate(entries);

  return (
    <>
      <div className={card.card}>
        <div className={card.header}>
          <h2>Transcription History</h2>
          <p className={card.description}>
            {total > 0 ? `${total} transcription${total !== 1 ? "s" : ""} stored` : "Your transcriptions will appear here"}
          </p>
        </div>
        <div className={card.body}>
          <div className={styles.searchContainer}>
            <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search transcriptions..."
              defaultValue={searchQuery}
              onChange={handleSearchChange}
              className={styles.searchInput}
            />
          </div>

          {entries.length === 0 && !loading ? (
            <div className={styles.emptyState}>
              {searchQuery ? "No transcriptions match your search." : "No transcriptions yet. Start recording to build your history."}
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
                          <span>{entry.wordCount} words</span>
                          <span>{entry.whisperModel}</span>
                          {entry.llmEnhanced && entry.llmProvider && (
                            <span className={styles.badge}>{entry.llmProvider}</span>
                          )}
                        </div>
                      </div>
                      <CopyButton text={entry.text} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className={styles.sentinel}>
            {loading && <div className={styles.spinner}>Loading...</div>}
          </div>
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
              {confirmClear ? "Confirm Clear All History" : "Clear History"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
