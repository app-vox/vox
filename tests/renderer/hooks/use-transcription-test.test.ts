// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { installVoxApiMock, resetStores } from "../helpers/setup";
import type { VoxAPI } from "../../../src/preload/index";

vi.mock("../../../src/renderer/utils/record-audio", () => ({
  recordAudio: vi.fn().mockResolvedValue({ audioBuffer: [0], sampleRate: 16000 }),
}));

let mockApi: VoxAPI;

beforeEach(() => {
  mockApi = installVoxApiMock();
  resetStores();
});

afterEach(() => {
  cleanup();
});

describe("useTranscriptionTest", () => {
  it("should start with idle state", async () => {
    const { useTranscriptionTest } = await import(
      "../../../src/renderer/hooks/use-transcription-test"
    );
    const { result } = renderHook(() => useTranscriptionTest());
    expect(result.current.testing).toBe(false);
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("should run test and set result on success", async () => {
    vi.mocked(mockApi.pipeline.testTranscribe).mockResolvedValue({
      rawText: "hello world",
      correctedText: "Hello, world!",
      llmError: null,
    });
    const { useTranscriptionTest } = await import(
      "../../../src/renderer/hooks/use-transcription-test"
    );
    const { result } = renderHook(() => useTranscriptionTest());
    await act(async () => { await result.current.run(); });
    expect(result.current.testing).toBe(false);
    expect(result.current.result?.rawText).toBe("hello world");
    expect(result.current.result?.correctedText).toBe("Hello, world!");
    expect(result.current.error).toBeNull();
  });

  it("should set error on failure", async () => {
    vi.mocked(mockApi.pipeline.testTranscribe).mockRejectedValue(new Error("Model not loaded"));
    const { useTranscriptionTest } = await import(
      "../../../src/renderer/hooks/use-transcription-test"
    );
    const { result } = renderHook(() => useTranscriptionTest());
    await act(async () => { await result.current.run(); });
    expect(result.current.testing).toBe(false);
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBe("Model not loaded");
  });

  it("should set error for empty transcription", async () => {
    vi.mocked(mockApi.pipeline.testTranscribe).mockResolvedValue({
      rawText: "",
      correctedText: null,
      llmError: null,
    });
    const { useTranscriptionTest } = await import(
      "../../../src/renderer/hooks/use-transcription-test"
    );
    const { result } = renderHook(() => useTranscriptionTest());
    await act(async () => { await result.current.run(); });
    expect(result.current.error).toBe("no-speech");
    expect(result.current.result).toBeNull();
  });

  it("should accept custom duration", async () => {
    const { recordAudio } = await import("../../../src/renderer/utils/record-audio");
    vi.mocked(mockApi.pipeline.testTranscribe).mockResolvedValue({
      rawText: "test",
      correctedText: null,
      llmError: null,
    });
    const { useTranscriptionTest } = await import(
      "../../../src/renderer/hooks/use-transcription-test"
    );
    const { result } = renderHook(() => useTranscriptionTest(5));
    await act(async () => { await result.current.run(); });
    expect(recordAudio).toHaveBeenCalledWith(5);
  });

  it("should reset state", async () => {
    vi.mocked(mockApi.pipeline.testTranscribe).mockResolvedValue({
      rawText: "hello",
      correctedText: null,
      llmError: null,
    });
    const { useTranscriptionTest } = await import(
      "../../../src/renderer/hooks/use-transcription-test"
    );
    const { result } = renderHook(() => useTranscriptionTest());
    await act(async () => { await result.current.run(); });
    expect(result.current.result).not.toBeNull();
    act(() => { result.current.reset(); });
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
