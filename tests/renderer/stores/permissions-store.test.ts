import { describe, it, expect, vi, beforeEach } from "vitest";
import { installVoxApiMock, resetStores } from "../helpers/setup";
import { usePermissionsStore } from "../../../src/renderer/stores/permissions-store";
import type { VoxAPI } from "../../../src/preload/index";

let mockApi: VoxAPI;

beforeEach(() => {
  mockApi = installVoxApiMock();
  resetStores();
});

describe("usePermissionsStore", () => {
  it("should start with null status and keychainStatus", () => {
    const state = usePermissionsStore.getState();
    expect(state.status).toBeNull();
    expect(state.keychainStatus).toBeNull();
  });

  describe("refresh", () => {
    it("should fetch and set permissions status and keychain status", async () => {
      const permStatus = { microphone: "granted" as const, accessibility: true, pid: 123, execPath: "/app", bundleId: "com.test" };
      const keychainStatus = { available: true, encryptedCount: 3 };

      vi.mocked(mockApi.permissions.status).mockResolvedValue(permStatus);
      vi.mocked(mockApi.permissions.keychainStatus).mockResolvedValue(keychainStatus);

      await usePermissionsStore.getState().refresh();

      const state = usePermissionsStore.getState();
      expect(state.status).toEqual(permStatus);
      expect(state.keychainStatus).toEqual(keychainStatus);
    });

    it("should call both status and keychainStatus APIs", async () => {
      await usePermissionsStore.getState().refresh();

      expect(mockApi.permissions.status).toHaveBeenCalledOnce();
      expect(mockApi.permissions.keychainStatus).toHaveBeenCalledOnce();
    });
  });

  describe("requestMicrophone", () => {
    it("should call requestMicrophone API and then refresh", async () => {
      const permStatus = { microphone: "granted" as const, accessibility: true, pid: 1, execPath: "", bundleId: "" };
      vi.mocked(mockApi.permissions.status).mockResolvedValue(permStatus);

      await usePermissionsStore.getState().requestMicrophone();

      expect(mockApi.permissions.requestMicrophone).toHaveBeenCalledOnce();
      // Should also refresh status after requesting
      expect(mockApi.permissions.status).toHaveBeenCalled();
      expect(mockApi.permissions.keychainStatus).toHaveBeenCalled();
    });
  });

  describe("requestAccessibility", () => {
    it("should call requestAccessibility API", async () => {
      await usePermissionsStore.getState().requestAccessibility();

      expect(mockApi.permissions.requestAccessibility).toHaveBeenCalledOnce();
    });
  });
});
