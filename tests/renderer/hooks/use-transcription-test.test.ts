// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { installVoxApiMock, resetStores } from "../helpers/setup";
import type { VoxAPI } from "../../../src/preload/index";

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
    vi.mocked(mockApi.whisper.test).mockResolvedValue("hello world");
    const { useTranscriptionTest } = await import(
      "../../../src/renderer/hooks/use-transcription-test"
    );
    const { result } = renderHook(() => useTranscriptionTest());
    await act(async () => { await result.current.run(); });
    expect(result.current.testing).toBe(false);
    expect(result.current.result?.rawText).toBe("hello world");
    expect(result.current.result?.correctedText).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("should set error on failure", async () => {
    vi.mocked(mockApi.whisper.test).mockRejectedValue(new Error("Model not loaded"));
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
    vi.mocked(mockApi.whisper.test).mockResolvedValue("");
    const { useTranscriptionTest } = await import(
      "../../../src/renderer/hooks/use-transcription-test"
    );
    const { result } = renderHook(() => useTranscriptionTest());
    await act(async () => { await result.current.run(); });
    expect(result.current.error).toBe("no-speech");
    expect(result.current.result).toBeNull();
  });

  it("should pass custom duration to whisper.test", async () => {
    vi.mocked(mockApi.whisper.test).mockResolvedValue("test");
    const { useTranscriptionTest } = await import(
      "../../../src/renderer/hooks/use-transcription-test"
    );
    const { result } = renderHook(() => useTranscriptionTest(5));
    await act(async () => { await result.current.run(); });
    expect(mockApi.whisper.test).toHaveBeenCalledWith(5);
  });

  it("should reset state", async () => {
    vi.mocked(mockApi.whisper.test).mockResolvedValue("hello");
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
