import { useEffect, useRef, useCallback, useState } from "react";
import { useTranscriptionsStore } from "../../stores/transcriptions-store";
import { useT } from "../../i18n-context";
import type { TranscriptionEntry } from "../../../shared/types";
import {
  SearchIcon,
  CheckIcon,
  CopyIcon,
  TrashAltIcon,
  ChevronsLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsRightIcon,
  InfoCircleIcon,
} from "../../../shared/icons";
import { CustomSelect } from "../ui/CustomSelect";
import card from "../shared/card.module.scss";
import styles from "./TranscriptionsPanel.module.scss";

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
        <CheckIcon width={14} height={14} />
      ) : (
        <CopyIcon width={14} height={14} />
      )}
      <span>{copied ? t("history.copied") : t("history.copy")}</span>
    </button>
  );
}

export function TranscriptionsPanel() {
  const t = useT();
  const entries = useTranscriptionsStore((s) => s.entries);
  const total = useTranscriptionsStore((s) => s.total);
  const page = useTranscriptionsStore((s) => s.page);
  const pageSize = useTranscriptionsStore((s) => s.pageSize);
  const loading = useTranscriptionsStore((s) => s.loading);
  const searchQuery = useTranscriptionsStore((s) => s.searchQuery);
  const fetchPage = useTranscriptionsStore((s) => s.fetchPage);
  const setPage = useTranscriptionsStore((s) => s.setPage);
  const setPageSize = useTranscriptionsStore((s) => s.setPageSize);
  const search = useTranscriptionsStore((s) => s.search);
  const deleteEntry = useTranscriptionsStore((s) => s.deleteEntry);
  const clearHistory = useTranscriptionsStore((s) => s.clearHistory);
  const reset = useTranscriptionsStore((s) => s.reset);

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
        <div className={card.infoBanner}>
          <InfoCircleIcon width={14} height={14} />
          <span>{t("history.clipboardHint")}</span>
        </div>
        <div className={card.body}>
          <div className={styles.searchContainer}>
            <SearchIcon className={styles.searchIcon} width={16} height={16} />
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
                        <button
                          className={styles.deleteButton}
                          onClick={() => deleteEntry(entry.id)}
                          title={t("history.deleteTranscription")}
                        >
                          <TrashAltIcon width={14} height={14} />
                        </button>
                        <CopyButton text={entry.text} t={t} />
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
                {page > 2 && (
                  <button onClick={() => setPage(1)}>
                    <ChevronsLeftIcon width={12} height={12} />
                  </button>
                )}
                <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeftIcon width={12} height={12} />
                </button>
                <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRightIcon width={12} height={12} />
                </button>
                {page < totalPages - 1 && (
                  <button onClick={() => setPage(totalPages)}>
                    <ChevronsRightIcon width={12} height={12} />
                  </button>
                )}
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
                  onChange={(value) => setPageSize(Number(value))}
                />
              </div>
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
