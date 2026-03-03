import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock electron-store before importing HistoryManager
vi.mock("electron-store", () => {
  const MockStore = class {
    private data: Record<string, unknown> = {};
    get(key: string, defaultValue?: unknown) { return this.data[key] ?? defaultValue; }
    set(key: string, value: unknown) { this.data[key] = value; }
    clear() { this.data = {}; }
  };
  return { default: MockStore };
});

// Mock crypto.randomUUID
vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "test-uuid-1234") });

vi.mock("../../../src/main/audio/persistence", () => ({
  deleteAudioFile: vi.fn(),
}));

import { HistoryManager } from "../../../src/main/history/manager";
import { deleteAudioFile } from "../../../src/main/audio/persistence";
import type { TranscriptionEntry } from "../../../src/shared/types";

describe("HistoryManager", () => {
  let manager: HistoryManager;

  beforeEach(() => {
    manager = new HistoryManager();
    vi.mocked(deleteAudioFile).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("add", () => {
    it("should add an entry and return it with generated id and timestamp", () => {
      const entry = manager.add({
        text: "Hello world",
        originalText: "hello world",
        wordCount: 2,
        audioDurationMs: 1500,
        whisperModel: "small",
        llmEnhanced: true,
        llmProvider: "foundry",
        llmModel: "gpt-4o",
        status: "success",
      });

      expect(entry.id).toBe("test-uuid-1234");
      expect(entry.text).toBe("Hello world");
      expect(entry.timestamp).toBeDefined();
    });

    it("should prepend new entries (newest first)", () => {
      manager.add({ text: "First", originalText: "first", wordCount: 1, audioDurationMs: 1000, whisperModel: "small", llmEnhanced: false, status: "success" });
      manager.add({ text: "Second", originalText: "second", wordCount: 1, audioDurationMs: 1000, whisperModel: "small", llmEnhanced: false, status: "success" });

      const result = manager.get(0, 10);
      expect(result.entries[0].text).toBe("Second");
      expect(result.entries[1].text).toBe("First");
    });
  });

  describe("get", () => {
    it("should return paginated entries with total count", () => {
      for (let i = 0; i < 5; i++) {
        manager.add({ text: `Entry ${i}`, originalText: `entry ${i}`, wordCount: 2, audioDurationMs: 1000, whisperModel: "small", llmEnhanced: false, status: "success" });
      }

      const page1 = manager.get(0, 2);
      expect(page1.entries).toHaveLength(2);
      expect(page1.total).toBe(5);

      const page2 = manager.get(2, 2);
      expect(page2.entries).toHaveLength(2);
      expect(page2.total).toBe(5);
    });

    it("should return empty result when no entries exist", () => {
      const result = manager.get(0, 20);
      expect(result.entries).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe("search", () => {
    it("should filter entries by text content (case-insensitive)", () => {
      manager.add({ text: "Meeting notes about React", originalText: "meeting notes about react", wordCount: 4, audioDurationMs: 2000, whisperModel: "small", llmEnhanced: false, status: "success" });
      manager.add({ text: "Shopping list for groceries", originalText: "shopping list for groceries", wordCount: 4, audioDurationMs: 1500, whisperModel: "small", llmEnhanced: false, status: "success" });
      manager.add({ text: "React component design", originalText: "react component design", wordCount: 3, audioDurationMs: 1800, whisperModel: "small", llmEnhanced: false, status: "success" });

      const result = manager.search("react", 0, 10);
      expect(result.entries).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("should search in originalText too", () => {
      manager.add({ text: "Enhanced version", originalText: "original version with keyword", wordCount: 2, audioDurationMs: 1000, whisperModel: "small", llmEnhanced: true, status: "success" });

      const result = manager.search("keyword", 0, 10);
      expect(result.entries).toHaveLength(1);
    });

    it("should return paginated search results", () => {
      for (let i = 0; i < 5; i++) {
        manager.add({ text: `React tip ${i}`, originalText: `react tip ${i}`, wordCount: 3, audioDurationMs: 1000, whisperModel: "small", llmEnhanced: false, status: "success" });
      }

      const result = manager.search("react", 0, 2);
      expect(result.entries).toHaveLength(2);
      expect(result.total).toBe(5);
    });
  });

  describe("clear", () => {
    it("should remove all entries", () => {
      manager.add({ text: "Entry", originalText: "entry", wordCount: 1, audioDurationMs: 1000, whisperModel: "small", llmEnhanced: false, status: "success" });
      manager.clear();

      const result = manager.get(0, 10);
      expect(result.entries).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe("cleanup", () => {
    it("should remove entries older than 30 days on add", () => {
      // Manually inject an old entry
      const oldEntry: TranscriptionEntry = {
        id: "old-entry",
        timestamp: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
        text: "Old entry",
        originalText: "old entry",
        wordCount: 2,
        audioDurationMs: 1000,
        whisperModel: "small",
        llmEnhanced: false,
        status: "success",
      };

      // Access internal store to inject the old entry
      const store = (manager as unknown as { store: { get: (k: string, d: unknown) => unknown; set: (k: string, v: unknown) => void } }).store;
      store.set("entries", [oldEntry]);

      // Adding a new entry should trigger cleanup
      manager.add({ text: "New entry", originalText: "new entry", wordCount: 2, audioDurationMs: 1000, whisperModel: "small", llmEnhanced: false, status: "success" });

      const result = manager.get(0, 10);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].text).toBe("New entry");
    });
  });

  describe("getEntry", () => {
    it("should return the entry by id", () => {
      const entry = manager.add({
        text: "Test", originalText: "test", wordCount: 1,
        audioDurationMs: 1000, whisperModel: "small", llmEnhanced: false,
        status: "success",
      });
      expect(manager.getEntry(entry.id)).toEqual(entry);
    });

    it("should return undefined for missing id", () => {
      expect(manager.getEntry("nonexistent")).toBeUndefined();
    });
  });

  describe("updateEntry", () => {
    it("should update fields of an existing entry", () => {
      const entry = manager.add({
        text: "", originalText: "", wordCount: 0,
        audioDurationMs: 2000, whisperModel: "small", llmEnhanced: false,
        status: "whisper_failed", errorMessage: "Timeout",
      });

      manager.updateEntry(entry.id, {
        text: "Recovered text", originalText: "recovered text",
        wordCount: 2, status: "success", errorMessage: undefined,
      });

      const updated = manager.getEntry(entry.id);
      expect(updated?.text).toBe("Recovered text");
      expect(updated?.status).toBe("success");
      expect(updated?.errorMessage).toBeUndefined();
    });

    it("should throw if entry not found", () => {
      expect(() => manager.updateEntry("missing", { text: "x" })).toThrow();
    });
  });

  describe("deleteEntry with audio cleanup", () => {
    it("should call deleteAudioFile when entry has audioFilePath", () => {
      const entry = manager.add({
        text: "Test", originalText: "test", wordCount: 1,
        audioDurationMs: 1000, whisperModel: "small", llmEnhanced: false,
        status: "success", audioFilePath: "/mock/audio/test.wav",
      });

      manager.deleteEntry(entry.id);

      expect(deleteAudioFile).toHaveBeenCalledWith("/mock/audio/test.wav");
      const result = manager.get(0, 10);
      expect(result.entries).toHaveLength(0);
    });
  });

  describe("clear with audio cleanup", () => {
    it("should delete all audio files when clearing history", () => {
      manager.add({
        text: "Entry 1", originalText: "entry 1", wordCount: 2,
        audioDurationMs: 1000, whisperModel: "small", llmEnhanced: false,
        status: "success", audioFilePath: "/mock/audio/e1.wav",
      });
      manager.add({
        text: "Entry 2", originalText: "entry 2", wordCount: 2,
        audioDurationMs: 1000, whisperModel: "small", llmEnhanced: false,
        status: "success", audioFilePath: "/mock/audio/e2.wav",
      });

      manager.clear();

      expect(deleteAudioFile).toHaveBeenCalledWith("/mock/audio/e1.wav");
      expect(deleteAudioFile).toHaveBeenCalledWith("/mock/audio/e2.wav");
    });
  });
});
