import Store from "electron-store";
import type { TranscriptionEntry, PaginatedResult } from "../../shared/types";
import { deleteAudioFile } from "../audio/persistence";

const RETENTION_DAYS = 30;

type AddEntryInput = Omit<TranscriptionEntry, "id" | "timestamp">;

interface HistoryStore {
  get(key: "entries", defaultValue: TranscriptionEntry[]): TranscriptionEntry[];
  set(key: "entries", value: TranscriptionEntry[]): void;
}

export class HistoryManager {
  private readonly store: HistoryStore;
  private _cache: TranscriptionEntry[] | null = null;

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
    this.saveEntries(pruned);

    return entry;
  }

  get(offset: number, limit: number): PaginatedResult<TranscriptionEntry> {
    const entries = this.getAllEntries();
    return {
      entries: entries.slice(offset, offset + limit),
      total: entries.length,
    };
  }

  getEntry(id: string): TranscriptionEntry | undefined {
    return this.getAllEntries().find((e) => e.id === id);
  }

  updateEntry(
    id: string,
    updates: Partial<Omit<TranscriptionEntry, "id" | "timestamp">>,
  ): TranscriptionEntry {
    const entries = this.getAllEntries();
    const index = entries.findIndex((e) => e.id === id);
    if (index === -1) throw new Error(`Entry not found: ${id}`);
    entries[index] = { ...entries[index], ...updates };
    this.saveEntries(entries);
    return entries[index];
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

  deleteEntry(id: string): void {
    const entries = this.getAllEntries();
    const entry = entries.find((e) => e.id === id);
    if (entry?.audioFilePath) {
      deleteAudioFile(entry.audioFilePath);
    }
    this.saveEntries(entries.filter((e) => e.id !== id));
  }

  clear(): void {
    const entries = this.getAllEntries();
    for (const entry of entries) {
      if (entry.audioFilePath) deleteAudioFile(entry.audioFilePath);
    }
    this.saveEntries([]);
  }

  cleanup(): void {
    const entries = this.getAllEntries();
    const pruned = this.prune(entries);
    this.saveEntries(pruned);
  }

  enforceAudioRetention(limit: number): void {
    const entries = this.getAllEntries();
    const withAudio = entries.filter((e) => e.audioFilePath);

    if (withAudio.length <= limit) return;

    // Entries are sorted newest-first. Remove audio from oldest beyond limit.
    const toRemove = withAudio.slice(limit);
    for (const entry of toRemove) {
      if (entry.audioFilePath) {
        deleteAudioFile(entry.audioFilePath);
      }
      entry.audioFilePath = undefined;
    }

    this.saveEntries(entries);
  }

  private getAllEntries(): TranscriptionEntry[] {
    if (this._cache === null) {
      this._cache = this.store.get("entries", []);
    }
    return this._cache;
  }

  private saveEntries(entries: TranscriptionEntry[]): void {
    this._cache = entries;
    this.store.set("entries", entries);
  }

  public getAllEntryIds(): string[] {
    return this.getAllEntries().map((e) => e.id);
  }

  private prune(entries: TranscriptionEntry[]): TranscriptionEntry[] {
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const keep: TranscriptionEntry[] = [];
    for (const e of entries) {
      if (new Date(e.timestamp).getTime() > cutoff) {
        keep.push(e);
      } else if (e.audioFilePath) {
        deleteAudioFile(e.audioFilePath);
      }
    }
    return keep;
  }
}
