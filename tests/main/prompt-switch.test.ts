import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const { send, updateTrayConfig } = vi.hoisted(() => ({
  send: vi.fn(),
  updateTrayConfig: vi.fn(),
}));

// Electron cannot run in the test process: one open settings window stands in for BrowserWindow.
vi.mock("electron", () => ({
  app: { isPackaged: false, getLocale: vi.fn(() => "en-US") },
  BrowserWindow: { getAllWindows: () => [{ webContents: { send } }] },
}));

// The tray module drives Electron's Tray and Menu, which cannot run here; the test reads the config it is given.
vi.mock("../../src/main/tray", () => ({ updateTrayConfig }));

import { ConfigManager, type SecretStore } from "../../src/main/config/manager";
import { PromptSwitch } from "../../src/main/prompt-switch";
import { type VoxConfig } from "../../src/shared/config";
import { computeLlmConfigHash, isEnhancementReady } from "../../src/shared/llm-config-hash";

const secrets: SecretStore = { encrypt: (v) => v, decrypt: (v) => v };

describe("PromptSwitch", () => {
  let testDir: string;
  let configManager: ConfigManager;
  let promptSwitch: PromptSwitch;

  function saveReadyConfigWithFirstActive(): VoxConfig {
    const config = configManager.load();
    config.enableLlmEnhancement = true;
    config.llmConnectionTested = true;
    config.llm = { provider: "openai", openaiEndpoint: "https://api.openai.com", openaiApiKey: "sk-test", openaiModel: "gpt-4o" };
    config.llmConfigHash = computeLlmConfigHash(config);
    config.prompts = [
      { id: "first", name: "Cleanup", icon: "🧹", instructions: "Clean it up." },
      { id: "second", name: "German", icon: "🇩🇪", instructions: "Translate to German." },
      { id: "third", name: "English", icon: "🇬🇧", instructions: "Translate to English." },
    ];
    config.activePromptId = "first";
    configManager.save(config);
    return configManager.load();
  }

  function lastTrayConfig(): VoxConfig {
    return updateTrayConfig.mock.calls.at(-1)?.[0];
  }

  beforeEach(() => {
    vi.clearAllMocks();
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "vox-prompt-switch-"));
    configManager = new ConfigManager(testDir, secrets);
    promptSwitch = new PromptSwitch(configManager);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it("a stale settings save does not revert the active prompt", () => {
    const settingsCopy = saveReadyConfigWithFirstActive();

    promptSwitch.setActivePrompt("third");
    settingsCopy.prompts[1] = { ...settingsCopy.prompts[1], name: "Deutsch" };
    promptSwitch.saveKeepingActivePrompt(settingsCopy);

    const saved = configManager.load();
    expect(saved.activePromptId).toBe("third");
    expect(saved.prompts[1].name).toBe("Deutsch");
    expect(lastTrayConfig().activePromptId).toBe("third");
    expect(send).toHaveBeenCalledWith("config:changed");
  });

  it("a stale connection test does not revert the active prompt", () => {
    const settingsCopy = saveReadyConfigWithFirstActive();

    promptSwitch.setActivePrompt("third");
    settingsCopy.llmConnectionTested = true;
    settingsCopy.llmConfigHash = computeLlmConfigHash(settingsCopy);
    promptSwitch.saveKeepingActivePrompt(settingsCopy);

    const saved = configManager.load();
    expect(saved.activePromptId).toBe("third");
    expect(isEnhancementReady(saved)).toBe(true);
  });

  it("an enhancement failure refreshes the tray with an untested config", () => {
    saveReadyConfigWithFirstActive();

    promptSwitch.markConnectionUntested();

    expect(isEnhancementReady(lastTrayConfig())).toBe(false);
    expect(lastTrayConfig().llmConfigHash).toBe("");
    expect(isEnhancementReady(configManager.load())).toBe(false);
    expect(configManager.load().activePromptId).toBe("first");
    expect(send).toHaveBeenCalledWith("config:changed");
  });

  it("a failed connection test refreshes the tray with an untested config", () => {
    const settingsCopy = saveReadyConfigWithFirstActive();
    promptSwitch.setActivePrompt("third");

    // The llm:test failure branch: save the tested settings, keeping main's active prompt, then mark untested.
    promptSwitch.saveKeepingActivePrompt(settingsCopy);
    promptSwitch.markConnectionUntested();

    expect(isEnhancementReady(lastTrayConfig())).toBe(false);
    expect(lastTrayConfig().activePromptId).toBe("third");
    expect(isEnhancementReady(configManager.load())).toBe(false);
    expect(send).toHaveBeenLastCalledWith("config:changed");
  });
});
