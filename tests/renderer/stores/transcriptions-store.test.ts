import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTranscriptionsStore } from "../../../src/renderer/stores/transcriptions-store";
import { installVoxApiMock, resetStores } from "../helpers/setup";
import type { VoxAPI } from "../../../src/preload/index";
import type { TranscriptionEntry } from "../../../src/shared/types";

let voxApi: VoxAPI;

const fakeEntry = (id: string): TranscriptionEntry => ({
  id,
  timestamp: "2026-01-01T00:00:00Z",
  text: `text-${id}`,
  originalText: `orig-${id}`,
  wordCount: 2,
  audioDurationMs: 1000,
  whisperModel: "small",
  llmEnhanced: false,
});

beforeEach(() => {
  voxApi = installVoxApiMock();
  resetStores();
  localStorage.clear();
});

describe("transcriptions-store", () => {
  describe("fetchPage", () => {
    it("skips fetch when already loading (race condition guard)", async () => {
      useTranscriptionsStore.setState({ loading: true });

      await useTranscriptionsStore.getState().fetchPage();

      expect(voxApi.history.get).not.toHaveBeenCalled();
    });

    it("computes correct offset from page and pageSize", async () => {
      useTranscriptionsStore.setState({ page: 3, pageSize: 5 });
      voxApi.history.get = vi.fn().mockResolvedValue({ entries: [], total: 0 });

      await useTranscriptionsStore.getState().fetchPage();

      expect(voxApi.history.get).toHaveBeenCalledWith({ offset: 10, limit: 5 });
    });

    it("uses history.search when searchQuery is set", async () => {
      useTranscriptionsStore.setState({ searchQuery: "hello", page: 1, pageSize: 10 });
      voxApi.history.search = vi.fn().mockResolvedValue({ entries: [], total: 0 });

      await useTranscriptionsStore.getState().fetchPage();

      expect(voxApi.history.search).toHaveBeenCalledWith({ query: "hello", offset: 0, limit: 10 });
      expect(voxApi.history.get).not.toHaveBeenCalled();
    });

    it("uses history.get when searchQuery is empty", async () => {
      useTranscriptionsStore.setState({ searchQuery: "", page: 1, pageSize: 10 });
      voxApi.history.get = vi.fn().mockResolvedValue({ entries: [fakeEntry("1")], total: 1 });

      await useTranscriptionsStore.getState().fetchPage();

      expect(voxApi.history.get).toHaveBeenCalled();
      expect(useTranscriptionsStore.getState().entries).toHaveLength(1);
    });

    it("sets loading back to false even on error", async () => {
      voxApi.history.get = vi.fn().mockRejectedValue(new Error("fail"));

      await useTranscriptionsStore.getState().fetchPage().catch(() => {});

      expect(useTranscriptionsStore.getState().loading).toBe(false);
    });
  });

  describe("setPage", () => {
    it("updates page and triggers fetch", async () => {
      voxApi.history.get = vi.fn().mockResolvedValue({ entries: [], total: 0 });

      useTranscriptionsStore.getState().setPage(2);

      expect(useTranscriptionsStore.getState().page).toBe(2);
      await vi.waitFor(() => expect(voxApi.history.get).toHaveBeenCalled());
    });
  });

  describe("setPageSize", () => {
    it("resets to page 1 and triggers fetch", async () => {
      useTranscriptionsStore.setState({ page: 5 });
      voxApi.history.get = vi.fn().mockResolvedValue({ entries: [], total: 0 });

      useTranscriptionsStore.getState().setPageSize(25);

      expect(useTranscriptionsStore.getState().page).toBe(1);
      expect(useTranscriptionsStore.getState().pageSize).toBe(25);
      await vi.waitFor(() => expect(voxApi.history.get).toHaveBeenCalled());
    });

    it("persists pageSize to localStorage", () => {
      useTranscriptionsStore.getState().setPageSize(25);
      expect(localStorage.getItem("vox:history-pageSize")).toBe("25");
    });
  });

  describe("search", () => {
    it("clears entries and resets page before fetching", async () => {
      useTranscriptionsStore.setState({
        entries: [fakeEntry("old")],
        total: 1,
        page: 3,
      });
      voxApi.history.search = vi.fn().mockResolvedValue({ entries: [fakeEntry("new")], total: 1 });

      await useTranscriptionsStore.getState().search("test");

      expect(useTranscriptionsStore.getState().searchQuery).toBe("test");
      expect(useTranscriptionsStore.getState().page).toBe(1);
      expect(useTranscriptionsStore.getState().entries[0].id).toBe("new");
    });

    it("uses history.get when query is empty", async () => {
      voxApi.history.get = vi.fn().mockResolvedValue({ entries: [], total: 0 });

      await useTranscriptionsStore.getState().search("");

      expect(voxApi.history.get).toHaveBeenCalled();
      expect(voxApi.history.search).not.toHaveBeenCalled();
    });
  });

  describe("deleteEntry", () => {
    it("calls IPC delete and re-fetches current page", async () => {
      voxApi.history.get = vi.fn().mockResolvedValue({ entries: [], total: 0 });

      await useTranscriptionsStore.getState().deleteEntry("abc");

      expect(voxApi.history.deleteEntry).toHaveBeenCalledWith("abc");
      await vi.waitFor(() => expect(voxApi.history.get).toHaveBeenCalled());
    });
  });

  describe("clearHistory", () => {
    it("calls IPC clear and resets state without fetching", async () => {
      useTranscriptionsStore.setState({ entries: [fakeEntry("1")], total: 5, page: 3 });

      await useTranscriptionsStore.getState().clearHistory();

      expect(voxApi.history.clear).toHaveBeenCalled();
      expect(useTranscriptionsStore.getState().entries).toEqual([]);
      expect(useTranscriptionsStore.getState().total).toBe(0);
      expect(useTranscriptionsStore.getState().page).toBe(1);
      expect(voxApi.history.get).not.toHaveBeenCalled();
    });
  });

  describe("reset", () => {
    it("resets all state without any IPC calls", () => {
      useTranscriptionsStore.setState({
        entries: [fakeEntry("1")],
        total: 10,
        page: 5,
        searchQuery: "test",
        loading: true,
      });

      useTranscriptionsStore.getState().reset();

      const state = useTranscriptionsStore.getState();
      expect(state.entries).toEqual([]);
      expect(state.total).toBe(0);
      expect(state.page).toBe(1);
      expect(state.searchQuery).toBe("");
      expect(state.loading).toBe(false);
    });
  });
});
