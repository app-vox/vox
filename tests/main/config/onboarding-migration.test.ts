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

describe("onboarding migration", () => {
  const configDir = "/tmp/test-onboarding-" + Date.now();
  const configPath = configDir + "/config.json";

  beforeEach(() => {
    fs.mkdirSync(configDir, { recursive: true });
  });

  it("defaults onboardingCompleted to false for fresh install (no config file)", () => {
    const manager = new ConfigManager(configDir, noopSecrets);
    const config = manager.load();
    expect(config.onboardingCompleted).toBe(false);
  });

  it("defaults onboardingCompleted to true for existing config without the field", () => {
    fs.writeFileSync(configPath, JSON.stringify({
      whisper: { model: "small" },
      llm: { provider: "foundry", endpoint: "", apiKey: "", model: "gpt-4o" },
    }));
    const manager = new ConfigManager(configDir, noopSecrets);
    const config = manager.load();
    expect(config.onboardingCompleted).toBe(true);
  });

  it("preserves onboardingCompleted when explicitly set to false", () => {
    fs.writeFileSync(configPath, JSON.stringify({
      onboardingCompleted: false,
      whisper: { model: "" },
      llm: { provider: "foundry", endpoint: "", apiKey: "", model: "gpt-4o" },
    }));
    const manager = new ConfigManager(configDir, noopSecrets);
    const config = manager.load();
    expect(config.onboardingCompleted).toBe(false);
  });

  it("preserves onboardingCompleted when explicitly set to true", () => {
    fs.writeFileSync(configPath, JSON.stringify({
      onboardingCompleted: true,
      whisper: { model: "small" },
      llm: { provider: "foundry", endpoint: "", apiKey: "", model: "gpt-4o" },
    }));
    const manager = new ConfigManager(configDir, noopSecrets);
    const config = manager.load();
    expect(config.onboardingCompleted).toBe(true);
  });
});
