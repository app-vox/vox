import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Electron cannot run in the test process: the tray module only needs these to load, and PromptSwitch finds no open window.
vi.mock("electron", () => ({
  app: { isPackaged: false, getLocale: () => "en-US", getVersion: () => "1.0.0", on: vi.fn() },
  BrowserWindow: { getAllWindows: () => [] },
}));

import { buildPromptMenuItems, type TrayCallbacks } from "../../src/main/tray";
import { ConfigManager, type SecretStore } from "../../src/main/config/manager";
import { PromptSwitch } from "../../src/main/prompt-switch";
import { type VoxConfig } from "../../src/shared/config";
import { computeLlmConfigHash } from "../../src/shared/llm-config-hash";

type MenuItem = Electron.MenuItemConstructorOptions;

const secrets: SecretStore = { encrypt: (v) => v, decrypt: (v) => v };

describe("Tray prompt submenu", () => {
  let testDir: string;
  let configManager: ConfigManager;
  let callbacks: Pick<TrayCallbacks, "onSelectPrompt" | "onOpenPromptSettings">;

  function saveConfigWithFirstActive(enhancementReady: boolean): VoxConfig {
    const config = configManager.load();
    config.enableLlmEnhancement = enhancementReady;
    config.llmConnectionTested = true;
    config.llm = { provider: "openai", openaiEndpoint: "https://api.openai.com", openaiApiKey: "sk-test", openaiModel: "gpt-4o" };
    config.llmConfigHash = computeLlmConfigHash(config);
    config.prompts = [
      { id: "first", name: "Cleanup", icon: "🧹", instructions: "Clean it up." },
      { id: "second", name: "Translate to German", icon: "🇩🇪", instructions: "Translate to German." },
      { id: "third", name: "Translate to English", icon: "🇬🇧", instructions: "Translate to English." },
    ];
    config.activePromptId = "first";
    configManager.save(config);
    return configManager.load();
  }

  function promptMenu(config: VoxConfig): { submenu: MenuItem; options: MenuItem[]; settings: MenuItem } {
    const [submenu, settings] = buildPromptMenuItems(config, callbacks);
    return { submenu, options: submenu.submenu as MenuItem[], settings };
  }

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "vox-tray-"));
    configManager = new ConfigManager(testDir, secrets);
    const promptSwitch = new PromptSwitch(configManager);
    callbacks = {
      onSelectPrompt: (id) => promptSwitch.setActivePrompt(id),
      onOpenPromptSettings: vi.fn(),
    };
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it("picking a prompt activates it and marks it", () => {
    const before = promptMenu(saveConfigWithFirstActive(true));
    expect(before.submenu.label).toBe("Prompt: 🧹 Cleanup");
    expect(before.options.map((option) => option.label)).toEqual([
      "None", "🧹 Cleanup", "🇩🇪 Translate to German", "🇬🇧 Translate to English",
    ]);
    expect(before.options.map((option) => option.checked)).toEqual([false, true, false, false]);

    before.options[3].click?.(undefined as never, undefined, undefined as never);

    const after = promptMenu(configManager.load());
    expect(configManager.load().activePromptId).toBe("third");
    expect(after.submenu.label).toBe("Prompt: 🇬🇧 Translate to English");
    expect(after.submenu.enabled).not.toBe(false);
    expect(after.options.map((option) => option.checked)).toEqual([false, false, false, true]);
    expect(after.settings.label).toBe("Prompt Settings");
  });

  it("prompt submenu is disabled while enhancement is off", () => {
    const { submenu, options, settings } = promptMenu(saveConfigWithFirstActive(false));

    expect(submenu.enabled).toBe(false);
    expect(submenu.label).toBe("Prompt: AI enhancement isn't ready");
    expect(options.map((option) => option.checked)).toEqual([false, true, false, false]);
    expect(settings.enabled).not.toBe(false);
    settings.click?.(undefined as never, undefined, undefined as never);
    expect(callbacks.onOpenPromptSettings).toHaveBeenCalledOnce();
  });
});
