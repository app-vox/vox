// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWhisperTest } from "../../../src/renderer/hooks/use-whisper-test";
import { installVoxApiMock } from "../helpers/setup";

vi.mock("../../../src/renderer/utils/record-audio", () => ({
  recordAudio: vi.fn().mockResolvedValue({ audioBuffer: [0], sampleRate: 16000 }),
}));

let voxApi: ReturnType<typeof installVoxApiMock>;

beforeEach(() => {
  vi.restoreAllMocks();
  voxApi = installVoxApiMock();
});

describe("useWhisperTest", () => {
  it("starts with idle state", () => {
    const { result } = renderHook(() => useWhisperTest());
    expect(result.current.testing).toBe(false);
    expect(result.current.testResult).toBeNull();
    expect(result.current.testError).toBeNull();
  });

  it("sets testing=true while recording", async () => {
    (voxApi.whisper.test as ReturnType<typeof vi.fn>).mockResolvedValue("hello world");
    const { result } = renderHook(() => useWhisperTest());

    await act(async () => {
      await result.current.runTest(3);
    });

    expect(result.current.testing).toBe(false);
    expect(result.current.testResult).toBe("hello world");
  });

  it("sets testError on empty result", async () => {
    (voxApi.whisper.test as ReturnType<typeof vi.fn>).mockResolvedValue("");
    const { result } = renderHook(() => useWhisperTest());

    await act(async () => {
      await result.current.runTest(3);
    });

    expect(result.current.testResult).toBeNull();
    expect(result.current.testError).toBe("no-speech");
  });

  it("sets testError on exception", async () => {
    (voxApi.whisper.test as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("mic failed"));
    const { result } = renderHook(() => useWhisperTest());

    await act(async () => {
      await result.current.runTest(3);
    });

    expect(result.current.testError).toBe("mic failed");
  });

  it("calls onSuccess callback when transcription succeeds", async () => {
    (voxApi.whisper.test as ReturnType<typeof vi.fn>).mockResolvedValue("hello");
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useWhisperTest({ onSuccess }));

    await act(async () => {
      await result.current.runTest(3);
    });

    expect(onSuccess).toHaveBeenCalledWith("hello");
  });

  it("allows manually setting testResult", () => {
    const { result } = renderHook(() => useWhisperTest());

    act(() => {
      result.current.setTestResult("pasted text");
    });

    expect(result.current.testResult).toBe("pasted text");
  });
});
