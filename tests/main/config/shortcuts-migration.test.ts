import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";
import { ConfigManager } from "../../../src/main/config/manager";

vi.mock("electron", () => ({
  app: { isPackaged: false, getPath: () => "/tmp/test" },
}));

const noopSecrets = {
  encrypt: (s: string) => s,
  decrypt: (s: string) => s,
};

describe("shortcuts mode migration", () => {
  const configDir = "/tmp/test-shortcuts-migration-" + Date.now();
  const configPath = configDir + "/config.json";

  beforeEach(() => {
    fs.mkdirSync(configDir, { recursive: true });
  });

  it("defaults mode to 'toggle' for fresh install (no config file)", () => {
    const manager = new ConfigManager(configDir, noopSecrets);
    const config = manager.load();
    expect(config.shortcuts.mode).toBe("toggle");
  });

  it("defaults mode to 'toggle' when existing config has no mode field", () => {
    fs.writeFileSync(configPath, JSON.stringify({
      shortcuts: { hold: "Ctrl+Space", toggle: "Ctrl+Shift+Space" },
      llm: { provider: "foundry", endpoint: "", apiKey: "", model: "gpt-4o" },
    }));
    const manager = new ConfigManager(configDir, noopSecrets);
    const config = manager.load();
    expect(config.shortcuts.mode).toBe("toggle");
    expect(config.shortcuts.hold).toBe("Ctrl+Space");
    expect(config.shortcuts.toggle).toBe("Ctrl+Shift+Space");
  });

  it("preserves mode when explicitly set to 'toggle'", () => {
    fs.writeFileSync(configPath, JSON.stringify({
      shortcuts: { mode: "toggle", hold: "Alt+Space", toggle: "Alt+Shift+Space" },
      llm: { provider: "foundry", endpoint: "", apiKey: "", model: "gpt-4o" },
    }));
    const manager = new ConfigManager(configDir, noopSecrets);
    const config = manager.load();
    expect(config.shortcuts.mode).toBe("toggle");
  });

  it("preserves mode when explicitly set to 'both'", () => {
    fs.writeFileSync(configPath, JSON.stringify({
      shortcuts: { mode: "both", hold: "Alt+Space", toggle: "Alt+Shift+Space" },
      llm: { provider: "foundry", endpoint: "", apiKey: "", model: "gpt-4o" },
    }));
    const manager = new ConfigManager(configDir, noopSecrets);
    const config = manager.load();
    expect(config.shortcuts.mode).toBe("both");
  });
});
