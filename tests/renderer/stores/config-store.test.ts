import { describe, it, expect, vi, beforeEach } from "vitest";
import { useConfigStore } from "../../../src/renderer/stores/config-store";
import { createDefaultConfig } from "../../../src/shared/config";
import { installVoxApiMock, resetStores } from "../helpers/setup";
import type { VoxAPI } from "../../../src/preload/index";

let voxApi: VoxAPI;

beforeEach(() => {
  voxApi = installVoxApiMock();
  resetStores();
  localStorage.clear();
});

describe("config-store", () => {
  describe("updateConfig", () => {
    it("merges llm fields within the same provider without overwriting siblings", () => {
      const config = createDefaultConfig();
      useConfigStore.setState({ config });
      // Default is foundry with model "gpt-4o"

      useConfigStore.getState().updateConfig({
        llm: { provider: "foundry", endpoint: "https://new", apiKey: "", model: "gpt-4o" },
      });

      const result = useConfigStore.getState().config!;
      expect(result.llm.provider).toBe("foundry");
      expect((result.llm as { endpoint: string }).endpoint).toBe("https://new");
    });

    it("replaces llm entirely when switching providers (discriminated union)", () => {
      const config = createDefaultConfig();
      useConfigStore.setState({ config });

      useConfigStore.getState().updateConfig({
        llm: { provider: "anthropic", anthropicApiKey: "key", anthropicModel: "claude-sonnet-4-20250514" },
      });

      const result = useConfigStore.getState().config!;
      expect(result.llm.provider).toBe("anthropic");
      expect((result.llm as { anthropicApiKey: string }).anthropicApiKey).toBe("key");
      // foundry fields should not exist on the new config
      expect("endpoint" in result.llm).toBe(false);
    });

    it("is a no-op when config is null", () => {
      useConfigStore.setState({ config: null });
      useConfigStore.getState().updateConfig({ theme: "dark" });
      expect(useConfigStore.getState().config).toBeNull();
    });

    it("merges top-level fields alongside nested objects", () => {
      const config = createDefaultConfig();
      useConfigStore.setState({ config });

      useConfigStore.getState().updateConfig({ theme: "dark", whisper: { model: "large" } });

      const result = useConfigStore.getState().config!;
      expect(result.theme).toBe("dark");
      expect(result.whisper.model).toBe("large");
    });
  });

  describe("loadConfig", () => {
    it("sets activeTab to 'transcriptions' on first run when setup is complete", async () => {
      const config = createDefaultConfig();
      voxApi.config.load = vi.fn().mockResolvedValue(config);
      voxApi.setup.check = vi.fn().mockResolvedValue({ hasAnyModel: true, downloadedModels: ["small"] });

      useConfigStore.setState({ _hasSavedTab: false, _hasUserNavigated: false });

      await useConfigStore.getState().loadConfig();

      expect(useConfigStore.getState().activeTab).toBe("transcriptions");
      expect(useConfigStore.getState().setupComplete).toBe(true);
      expect(useConfigStore.getState().loading).toBe(false);
    });

    it("sets activeTab to 'general' on first run when setup is NOT complete", async () => {
      const config = createDefaultConfig();
      voxApi.config.load = vi.fn().mockResolvedValue(config);
      voxApi.setup.check = vi.fn().mockResolvedValue({ hasAnyModel: false, downloadedModels: [] });

      useConfigStore.setState({ _hasSavedTab: false, _hasUserNavigated: false });

      await useConfigStore.getState().loadConfig();

      expect(useConfigStore.getState().activeTab).toBe("general");
    });

    it("preserves user-saved tab when _hasSavedTab is true", async () => {
      const config = createDefaultConfig();
      voxApi.config.load = vi.fn().mockResolvedValue(config);
      voxApi.setup.check = vi.fn().mockResolvedValue({ hasAnyModel: true, downloadedModels: ["small"] });

      useConfigStore.setState({ _hasSavedTab: true, activeTab: "shortcuts" });

      await useConfigStore.getState().loadConfig();

      expect(useConfigStore.getState().activeTab).toBe("shortcuts");
    });

    it("preserves tab when user has already navigated", async () => {
      const config = createDefaultConfig();
      voxApi.config.load = vi.fn().mockResolvedValue(config);
      voxApi.setup.check = vi.fn().mockResolvedValue({ hasAnyModel: true, downloadedModels: ["small"] });

      useConfigStore.setState({ _hasUserNavigated: true, activeTab: "dictionary" });

      await useConfigStore.getState().loadConfig();

      expect(useConfigStore.getState().activeTab).toBe("dictionary");
    });
  });

  describe("setActiveTab", () => {
    it("persists tab to localStorage", () => {
      useConfigStore.getState().setActiveTab("whisper");
      expect(localStorage.getItem("vox:activeTab")).toBe("whisper");
      expect(useConfigStore.getState()._hasUserNavigated).toBe(true);
    });
  });

  describe("saveConfig", () => {
    it("calls config.save and shortcuts.enable", async () => {
      const config = createDefaultConfig();
      useConfigStore.setState({ config });
      voxApi.setup.check = vi.fn().mockResolvedValue({ hasAnyModel: true, downloadedModels: [] });

      await useConfigStore.getState().saveConfig();

      expect(voxApi.config.save).toHaveBeenCalledWith(config);
      expect(voxApi.shortcuts.enable).toHaveBeenCalled();
    });

    it("re-checks setup state after saving", async () => {
      const config = createDefaultConfig();
      useConfigStore.setState({ config, setupComplete: false });
      voxApi.setup.check = vi.fn().mockResolvedValue({ hasAnyModel: true, downloadedModels: ["small"] });

      await useConfigStore.getState().saveConfig();

      expect(useConfigStore.getState().setupComplete).toBe(true);
    });

    it("is a no-op when config is null", async () => {
      useConfigStore.setState({ config: null });
      await useConfigStore.getState().saveConfig();
      expect(voxApi.config.save).not.toHaveBeenCalled();
    });
  });
});
