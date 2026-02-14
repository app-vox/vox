import { create } from "zustand";
import type { TranscriptionEntry } from "../../shared/types";

const DEFAULT_PAGE_SIZE = 10;

interface HistoryState {
  entries: TranscriptionEntry[];
  total: number;
  page: number;
  pageSize: number;
  searchQuery: string;
  loading: boolean;

  fetchPage: () => Promise<void>;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  search: (query: string) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  reset: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  entries: [],
  total: 0,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  searchQuery: "",
  loading: false,

  fetchPage: async () => {
    const { page, pageSize, searchQuery, loading } = get();
    if (loading) return;

    set({ loading: true });

    try {
      const offset = (page - 1) * pageSize;
      const result = searchQuery
        ? await window.voxApi.history.search({ query: searchQuery, offset, limit: pageSize })
        : await window.voxApi.history.get({ offset, limit: pageSize });

      set({ entries: result.entries, total: result.total });
    } finally {
      set({ loading: false });
    }
  },

  setPage: (page: number) => {
    set({ page });
    get().fetchPage();
  },

  setPageSize: (size: number) => {
    set({ pageSize: size, page: 1 });
    get().fetchPage();
  },

  search: async (query: string) => {
    set({ searchQuery: query, entries: [], total: 0, page: 1, loading: true });

    try {
      const { pageSize } = get();
      const result = query
        ? await window.voxApi.history.search({ query, offset: 0, limit: pageSize })
        : await window.voxApi.history.get({ offset: 0, limit: pageSize });

      set({ entries: result.entries, total: result.total });
    } finally {
      set({ loading: false });
    }
  },

  deleteEntry: async (id: string) => {
    await window.voxApi.history.deleteEntry(id);
    get().fetchPage();
  },

  clearHistory: async () => {
    await window.voxApi.history.clear();
    set({ entries: [], total: 0, page: 1 });
  },

  reset: () => {
    set({ entries: [], total: 0, page: 1, searchQuery: "", loading: false });
  },
}));
