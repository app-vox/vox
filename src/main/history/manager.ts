import Store from "electron-store";
import type { TranscriptionEntry, PaginatedResult } from "../../shared/types";

const RETENTION_DAYS = 30;

type AddEntryInput = Omit<TranscriptionEntry, "id" | "timestamp">;

interface HistoryStore {
  get(key: "entries", defaultValue: TranscriptionEntry[]): TranscriptionEntry[];
  set(key: "entries", value: TranscriptionEntry[]): void;
}

export class HistoryManager {
  private readonly store: HistoryStore;

  constructor() {
    this.store = new Store({
      name: "history",
      defaults: { entries: [] },
    }) as unknown as HistoryStore;
  }

  add(input: AddEntryInput): TranscriptionEntry {
    const entry: TranscriptionEntry = {
      ...input,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    const entries = this.getAllEntries();
    entries.unshift(entry);

    const pruned = this.prune(entries);
    this.store.set("entries", pruned);

    return entry;
  }

  get(offset: number, limit: number): PaginatedResult<TranscriptionEntry> {
    const entries = this.getAllEntries();
    return {
      entries: entries.slice(offset, offset + limit),
      total: entries.length,
    };
  }

  search(query: string, offset: number, limit: number): PaginatedResult<TranscriptionEntry> {
    const lowerQuery = query.toLowerCase();
    const entries = this.getAllEntries();
    const filtered = entries.filter(
      (e) =>
        e.text.toLowerCase().includes(lowerQuery) ||
        e.originalText.toLowerCase().includes(lowerQuery),
    );
    return {
      entries: filtered.slice(offset, offset + limit),
      total: filtered.length,
    };
  }

  clear(): void {
    this.store.set("entries", []);
  }

  cleanup(): void {
    const entries = this.getAllEntries();
    const pruned = this.prune(entries);
    this.store.set("entries", pruned);
  }

  private getAllEntries(): TranscriptionEntry[] {
    return this.store.get("entries", []);
  }

  private prune(entries: TranscriptionEntry[]): TranscriptionEntry[] {
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    return entries.filter((e) => new Date(e.timestamp).getTime() > cutoff);
  }
}
