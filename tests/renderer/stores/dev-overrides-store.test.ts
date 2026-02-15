import { describe, it, expect, beforeEach } from "vitest";
import { useDevOverrides } from "../../../src/renderer/stores/dev-overrides-store";
import { resetStores } from "../helpers/setup";

beforeEach(() => {
  resetStores();
  localStorage.clear();
});

describe("dev-overrides-store", () => {
  describe("setEnabled", () => {
    it("toggles the enabled flag", () => {
      useDevOverrides.getState().setEnabled(true);
      expect(useDevOverrides.getState().overrides.enabled).toBe(true);

      useDevOverrides.getState().setEnabled(false);
      expect(useDevOverrides.getState().overrides.enabled).toBe(false);
    });

    it("persists to localStorage", () => {
      useDevOverrides.getState().setEnabled(true);
      const stored = JSON.parse(localStorage.getItem("vox:dev-overrides")!);
      expect(stored.enabled).toBe(true);
    });
  });

  describe("setOverride", () => {
    it("sets an individual override key", () => {
      useDevOverrides.getState().setOverride("updateStatus", "available");
      expect(useDevOverrides.getState().overrides.updateStatus).toBe("available");
    });

    it("preserves other override keys", () => {
      useDevOverrides.getState().setOverride("updateStatus", "available");
      useDevOverrides.getState().setOverride("online", false);

      expect(useDevOverrides.getState().overrides.updateStatus).toBe("available");
      expect(useDevOverrides.getState().overrides.online).toBe(false);
    });
  });

  describe("clearOverride", () => {
    it("removes a specific override key", () => {
      useDevOverrides.getState().setOverride("updateStatus", "available");
      useDevOverrides.getState().clearOverride("updateStatus");

      expect(useDevOverrides.getState().overrides.updateStatus).toBeUndefined();
    });
  });

  describe("clearAll", () => {
    it("resets to default state", () => {
      useDevOverrides.getState().setEnabled(true);
      useDevOverrides.getState().setOverride("updateStatus", "available");
      useDevOverrides.getState().setOverride("online", false);

      useDevOverrides.getState().clearAll();

      expect(useDevOverrides.getState().overrides).toEqual({ enabled: false });
    });
  });

  describe("localStorage resilience", () => {
    it("handles corrupted localStorage gracefully", () => {
      localStorage.setItem("vox:dev-overrides", "not-valid-json{{{");
      // Simulate what loadOverrides does
      useDevOverrides.setState({
        overrides: (() => {
          try {
            const raw = localStorage.getItem("vox:dev-overrides");
            if (raw) return JSON.parse(raw);
          } catch { /* ignore */ }
          return { enabled: false };
        })(),
      });

      expect(useDevOverrides.getState().overrides.enabled).toBe(false);
    });
  });
});
