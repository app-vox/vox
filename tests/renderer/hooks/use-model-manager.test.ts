// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { installVoxApiMock, resetStores } from "../helpers/setup";
import { useConfigStore } from "../../../src/renderer/stores/config-store";
import { createDefaultConfig } from "../../../src/shared/config";
import type { VoxAPI } from "../../../src/preload/index";
import type { ModelInfo } from "../../../src/preload/index";

let mockApi: VoxAPI;

const smallModel: ModelInfo = {
  size: "small",
  info: { description: "Small model", sizeBytes: 500_000_000, label: "Small" },
  downloaded: false,
};

const tinyModel: ModelInfo = {
  size: "tiny",
  info: { description: "Tiny model", sizeBytes: 100_000_000, label: "Tiny" },
  downloaded: true,
};

beforeEach(() => {
  mockApi = installVoxApiMock();
  resetStores();
  const config = createDefaultConfig();
  useConfigStore.setState({ config, loading: false });
});

afterEach(() => {
  cleanup();
});

describe("useModelManager", () => {
  it("should load models on mount", async () => {
    vi.mocked(mockApi.models.list).mockResolvedValue([smallModel, tinyModel]);

    const { useModelManager } = await import(
      "../../../src/renderer/hooks/use-model-manager"
    );

    const { result } = renderHook(() => useModelManager());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.models).toHaveLength(2);
    expect(mockApi.models.list).toHaveBeenCalled();
  });

  it("should auto-select first downloaded model", async () => {
    vi.mocked(mockApi.models.list).mockResolvedValue([smallModel, tinyModel]);

    const { useModelManager } = await import(
      "../../../src/renderer/hooks/use-model-manager"
    );

    const { result } = renderHook(() => useModelManager());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.selectedSize).toBe("tiny");
  });

  it("should start download and track progress", async () => {
    let progressCallback: (p: { size: string; downloaded: number; total: number }) => void;
    vi.mocked(mockApi.models.onDownloadProgress).mockImplementation((cb) => {
      progressCallback = cb;
      return () => {};
    });
    vi.mocked(mockApi.models.list).mockResolvedValue([smallModel]);

    const { useModelManager } = await import(
      "../../../src/renderer/hooks/use-model-manager"
    );

    const { result } = renderHook(() => useModelManager());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    act(() => {
      result.current.download("small");
    });

    expect(result.current.downloading).toBe("small");

    act(() => {
      progressCallback!({ size: "small", downloaded: 250_000_000, total: 500_000_000 });
    });

    expect(result.current.progress.downloaded).toBe(250_000_000);
    expect(result.current.progress.total).toBe(500_000_000);
  });

  it("should cancel download", async () => {
    vi.mocked(mockApi.models.list).mockResolvedValue([smallModel]);

    const { useModelManager } = await import(
      "../../../src/renderer/hooks/use-model-manager"
    );

    const { result } = renderHook(() => useModelManager());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    act(() => {
      result.current.download("small");
    });

    await act(async () => {
      await result.current.cancelDownload();
    });

    expect(mockApi.models.cancelDownload).toHaveBeenCalledWith("small");
    expect(result.current.downloading).toBeNull();
  });

  it("should delete a model", async () => {
    vi.mocked(mockApi.models.list).mockResolvedValue([tinyModel]);

    const { useModelManager } = await import(
      "../../../src/renderer/hooks/use-model-manager"
    );

    const { result } = renderHook(() => useModelManager());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    await act(async () => {
      await result.current.deleteModel("tiny");
    });

    expect(mockApi.models.delete).toHaveBeenCalledWith("tiny");
  });

  it("should select a model and update config", async () => {
    vi.mocked(mockApi.models.list).mockResolvedValue([tinyModel]);

    const { useModelManager } = await import(
      "../../../src/renderer/hooks/use-model-manager"
    );

    const { result } = renderHook(() => useModelManager());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    await act(async () => {
      await result.current.select("tiny");
    });

    expect(result.current.selectedSize).toBe("tiny");
    expect(useConfigStore.getState().config?.whisper.model).toBe("tiny");
  });
});
