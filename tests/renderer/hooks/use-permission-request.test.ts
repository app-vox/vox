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

describe("usePermissionRequest", () => {
  it("should auto-refresh permissions on mount", async () => {
    vi.mocked(mockApi.permissions.status).mockResolvedValue({
      microphone: "granted",
      accessibility: true,
      pid: 1,
      execPath: "",
      bundleId: "",
    });

    const { usePermissionRequest } = await import(
      "../../../src/renderer/hooks/use-permission-request"
    );

    const { result } = renderHook(() => usePermissionRequest());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.microphone.granted).toBe(true);
    expect(result.current.accessibility.granted).toBe(true);
  });

  it("should refresh permissions on window focus", async () => {
    vi.mocked(mockApi.permissions.status).mockResolvedValue({
      microphone: "not-determined",
      accessibility: false,
      pid: 1,
      execPath: "",
      bundleId: "",
    });

    const { usePermissionRequest } = await import(
      "../../../src/renderer/hooks/use-permission-request"
    );

    const { result } = renderHook(() => usePermissionRequest());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.microphone.granted).toBe(false);

    vi.mocked(mockApi.permissions.status).mockResolvedValue({
      microphone: "granted",
      accessibility: true,
      pid: 1,
      execPath: "",
      bundleId: "",
    });

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.microphone.granted).toBe(true);
  });

  it("should track requesting state for microphone", async () => {
    let resolveRequest: () => void;
    vi.mocked(mockApi.permissions.requestMicrophone).mockReturnValue(
      new Promise((r) => { resolveRequest = r; })
    );

    const { usePermissionRequest } = await import(
      "../../../src/renderer/hooks/use-permission-request"
    );

    const { result } = renderHook(() => usePermissionRequest());

    expect(result.current.microphone.requesting).toBe(false);

    let requestPromise: Promise<void>;
    act(() => {
      requestPromise = result.current.microphone.request();
    });

    expect(result.current.microphone.requesting).toBe(true);

    await act(async () => {
      resolveRequest!();
      await requestPromise!;
    });

    expect(result.current.microphone.requesting).toBe(false);
  });

  it("should call requestAccessibility", async () => {
    const { usePermissionRequest } = await import(
      "../../../src/renderer/hooks/use-permission-request"
    );

    const { result } = renderHook(() => usePermissionRequest());

    await act(async () => {
      await result.current.accessibility.request();
    });

    expect(mockApi.permissions.requestAccessibility).toHaveBeenCalledOnce();
  });

  it("should provide keychain status", async () => {
    vi.mocked(mockApi.permissions.keychainStatus).mockResolvedValue({
      available: true,
      encryptedCount: 3,
    });

    const { usePermissionRequest } = await import(
      "../../../src/renderer/hooks/use-permission-request"
    );

    const { result } = renderHook(() => usePermissionRequest());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.keychain.granted).toBe(true);
    expect(result.current.keychain.status?.encryptedCount).toBe(3);
  });
});
