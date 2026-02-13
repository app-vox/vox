import { create } from "zustand";
import type { TranscriptionEntry } from "../../shared/types";

const PAGE_SIZE = 20;

interface HistoryState {
  entries: TranscriptionEntry[];
  total: number;
  searchQuery: string;
  loading: boolean;
  hasMore: boolean;

  fetchPage: () => Promise<void>;
  search: (query: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  reset: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  entries: [],
  total: 0,
  searchQuery: "",
  loading: false,
  hasMore: true,

  fetchPage: async () => {
    const { entries, searchQuery, loading } = get();
    if (loading) return;

    set({ loading: true });

    try {
      const result = searchQuery
        ? await window.voxApi.history.search({ query: searchQuery, offset: entries.length, limit: PAGE_SIZE })
        : await window.voxApi.history.get({ offset: entries.length, limit: PAGE_SIZE });

      set({
        entries: [...entries, ...result.entries],
        total: result.total,
        hasMore: entries.length + result.entries.length < result.total,
      });
    } finally {
      set({ loading: false });
    }
  },

  search: async (query: string) => {
    set({ searchQuery: query, entries: [], total: 0, hasMore: true, loading: true });

    try {
      const result = query
        ? await window.voxApi.history.search({ query, offset: 0, limit: PAGE_SIZE })
        : await window.voxApi.history.get({ offset: 0, limit: PAGE_SIZE });

      set({
        entries: result.entries,
        total: result.total,
        hasMore: result.entries.length < result.total,
      });
    } finally {
      set({ loading: false });
    }
  },

  clearHistory: async () => {
    await window.voxApi.history.clear();
    set({ entries: [], total: 0, hasMore: false });
  },

  reset: () => {
    set({ entries: [], total: 0, searchQuery: "", loading: false, hasMore: true });
  },
}));
