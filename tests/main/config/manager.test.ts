import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { ConfigManager, type SecretStore, migrateHudPosition } from "../../../src/main/config/manager";
import { createDefaultConfig } from "../../../src/shared/config";

function createMockSecretStore(): SecretStore {
  return {
    encrypt: (v: string) => `enc:${Buffer.from(v).toString("base64")}`,
    decrypt: (v: string) => v.startsWith("enc:") ? Buffer.from(v.slice(4), "base64").toString() : v,
  };
}

describe("migrateHudPosition", () => {
  it("migrates old values", () => {
    expect(migrateHudPosition("left")).toBe("bottom-left");
    expect(migrateHudPosition("center")).toBe("bottom-center");
    expect(migrateHudPosition("right")).toBe("bottom-right");
  });

  it("passes through new values", () => {
    expect(migrateHudPosition("top-left")).toBe("top-left");
    expect(migrateHudPosition("bottom-center")).toBe("bottom-center");
    expect(migrateHudPosition("custom")).toBe("custom");
  });

  it("defaults undefined", () => {
    expect(migrateHudPosition(undefined)).toBe("bottom-center");
  });
});


describe("ConfigManager", () => {
  let testDir: string;
  let manager: ConfigManager;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "vox-test-"));
    manager = new ConfigManager(testDir, createMockSecretStore());
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it("should return default config when no config file exists", () => {
    const config = manager.load();
    expect(config).toEqual(createDefaultConfig());
  });

  it("should save and load config", () => {
    const config = createDefaultConfig();
    config.llm = { provider: "foundry", endpoint: "https://my-foundry.example.com", apiKey: "", model: "gpt-4o" };
    config.whisper.model = "medium";

    manager.save(config);
    const loaded = manager.load();

    expect(loaded.llm).toEqual({ provider: "foundry", endpoint: "https://my-foundry.example.com", apiKey: "", model: "gpt-4o" });
    expect(loaded.whisper.model).toBe("medium");
  });

  it("should create config directory if it does not exist", () => {
    const nestedDir = path.join(testDir, "nested", "config");
    const nestedManager = new ConfigManager(nestedDir, createMockSecretStore());
    const config = createDefaultConfig();

    nestedManager.save(config);

    expect(fs.existsSync(path.join(nestedDir, "config.json"))).toBe(true);
  });

  it("should merge saved config with defaults for missing fields", () => {
    const partialConfig = {
      llm: {
        provider: "foundry",
        endpoint: "https://test.com",
        apiKey: "",
        model: "gpt-4o",
      },
    };
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(path.join(testDir, "config.json"), JSON.stringify(partialConfig));

    const loaded = manager.load();

    expect(loaded.llm).toEqual({ provider: "foundry", endpoint: "https://test.com", apiKey: "", model: "gpt-4o" });
    expect(loaded.whisper.model).toBe("small");
    expect(loaded.shortcuts.hold).toBe("Alt+Space");
  });

  it("should merge old config without bedrock fields using defaults", () => {
    const oldConfig = {
      llm: {
        provider: "foundry",
        endpoint: "https://old.com",
        apiKey: "old-key",
        model: "claude",
      },
    };
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(path.join(testDir, "config.json"), JSON.stringify(oldConfig));

    const loaded = manager.load();

    expect(loaded.llm.provider).toBe("foundry");
    if (loaded.llm.provider === "foundry") {
      expect(loaded.llm.endpoint).toBe("https://old.com");
    }
  });

  it("should encrypt sensitive fields on save", () => {
    const config = createDefaultConfig();
    config.llm = { provider: "foundry", endpoint: "", apiKey: "my-secret-key", model: "gpt-4o" };

    manager.save(config);

    const raw = JSON.parse(fs.readFileSync(path.join(testDir, "config.json"), "utf-8"));
    expect(raw.llm.apiKey).toMatch(/^enc:/);
    expect(raw.llm.endpoint).toBe("");
  });

  it("should decrypt sensitive fields on load", () => {
    const config = createDefaultConfig();
    config.llm = { provider: "foundry", endpoint: "", apiKey: "my-secret-key", model: "gpt-4o" };

    manager.save(config);
    const loaded = manager.load();

    expect(loaded.llm.apiKey).toBe("my-secret-key");
  });

  it("should encrypt and decrypt bedrock sensitive fields", () => {
    const config = createDefaultConfig();
    config.llm = {
      provider: "bedrock", region: "us-east-1", profile: "",
      accessKeyId: "AKIA123", secretAccessKey: "aws-secret", modelId: "some-model",
    };

    manager.save(config);

    const raw = JSON.parse(fs.readFileSync(path.join(testDir, "config.json"), "utf-8"));
    expect(raw.llm.accessKeyId).toMatch(/^enc:/);
    expect(raw.llm.secretAccessKey).toMatch(/^enc:/);

    const loaded = manager.load();
    expect(loaded.llm.provider).toBe("bedrock");
    if (loaded.llm.provider === "bedrock") {
      expect(loaded.llm.accessKeyId).toBe("AKIA123");
      expect(loaded.llm.secretAccessKey).toBe("aws-secret");
    }
  });

  it("should transparently migrate plaintext config to encrypted", () => {
    const plainConfig = {
      llm: { provider: "foundry", endpoint: "https://test.com", apiKey: "plaintext-key", model: "gpt-4o" },
      whisper: { model: "small" },
      shortcuts: { hold: "Alt+Space", toggle: "Alt+Shift+Space" },
      theme: "system",
      enableLlmEnhancement: false,
      customPrompt: "",
    };
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(path.join(testDir, "config.json"), JSON.stringify(plainConfig));

    const loaded = manager.load();
    expect(loaded.llm.apiKey).toBe("plaintext-key");

    manager.save(loaded);

    const raw = JSON.parse(fs.readFileSync(path.join(testDir, "config.json"), "utf-8"));
    expect(raw.llm.apiKey).toMatch(/^enc:/);
  });

  it("should not encrypt empty values", () => {
    const config = createDefaultConfig();
    manager.save(config);

    const raw = JSON.parse(fs.readFileSync(path.join(testDir, "config.json"), "utf-8"));
    expect(raw.llm.apiKey).toBe("");
  });

  it("should persist and restore llmConnectionTested and llmConfigHash", () => {
    const config = createDefaultConfig();
    config.llmConnectionTested = true;
    config.llmConfigHash = "abc123";

    manager.save(config);
    const loaded = manager.load();

    expect(loaded.llmConnectionTested).toBe(true);
    expect(loaded.llmConfigHash).toBe("abc123");
  });

  it("should count encrypted secrets from raw config", () => {
    const config = createDefaultConfig();
    config.llm = { provider: "foundry", endpoint: "", apiKey: "my-key", model: "gpt-4o" };

    manager.save(config);
    expect(manager.countEncryptedSecrets()).toBe(1);
  });

  it("should return 0 when no secrets are stored", () => {
    const config = createDefaultConfig();
    manager.save(config);
    expect(manager.countEncryptedSecrets()).toBe(0);
  });

  it("should return 0 when config file does not exist", () => {
    expect(manager.countEncryptedSecrets()).toBe(0);
  });

  it("should migrate old hudPosition values on load", () => {
    const oldConfig = {
      llm: { provider: "foundry", endpoint: "", apiKey: "", model: "gpt-4o" },
      hudPosition: "center",
    };
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(path.join(testDir, "config.json"), JSON.stringify(oldConfig));

    const loaded = manager.load();
    expect(loaded.hudPosition).toBe("bottom-center");
  });

  it("should migrate left/right hud positions", () => {
    const oldConfig = {
      llm: { provider: "foundry", endpoint: "", apiKey: "", model: "gpt-4o" },
      hudPosition: "left",
    };
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(path.join(testDir, "config.json"), JSON.stringify(oldConfig));

    const loaded = manager.load();
    expect(loaded.hudPosition).toBe("bottom-left");
  });

  it("should pass through already-migrated positions", () => {
    const newConfig = {
      llm: { provider: "foundry", endpoint: "", apiKey: "", model: "gpt-4o" },
      hudPosition: "top-right",
    };
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(path.join(testDir, "config.json"), JSON.stringify(newConfig));

    const loaded = manager.load();
    expect(loaded.hudPosition).toBe("top-right");
  });

  it("should migrate overlayPosition to hudPosition when hudPosition is absent", () => {
    const oldConfig = {
      llm: { provider: "foundry", endpoint: "", apiKey: "", model: "gpt-4o" },
      overlayPosition: "top-center",
    };
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(path.join(testDir, "config.json"), JSON.stringify(oldConfig));

    const loaded = manager.load();
    expect(loaded.hudPosition).toBe("top-center");
  });

  it("should default speechLanguages to [] when absent from saved config", () => {
    const oldConfig = {
      llm: { provider: "foundry", endpoint: "", apiKey: "", model: "gpt-4o" },
      theme: "system",
    };
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(path.join(testDir, "config.json"), JSON.stringify(oldConfig));

    const loaded = manager.load();
    expect(loaded.speechLanguages).toEqual([]);
  });

  it("should preserve speechLanguages when present in saved config", () => {
    const configWithLangs = {
      llm: { provider: "foundry", endpoint: "", apiKey: "", model: "gpt-4o" },
      speechLanguages: ["pt", "en"],
    };
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(path.join(testDir, "config.json"), JSON.stringify(configWithLangs));

    const loaded = manager.load();
    expect(loaded.speechLanguages).toEqual(["pt", "en"]);
  });

  it("should preserve credentials from other providers on save (round-trip)", () => {
    const foundryConfig = createDefaultConfig();
    foundryConfig.llm = { provider: "foundry", endpoint: "https://foundry.com", apiKey: "foundry-key", model: "gpt-4o" };
    manager.save(foundryConfig);

    const raw = JSON.parse(fs.readFileSync(path.join(testDir, "config.json"), "utf-8"));
    raw.llm.openaiApiKey = "enc:" + Buffer.from("openai-key").toString("base64");
    raw.llm.openaiModel = "gpt-4-turbo";
    raw.llm.openaiEndpoint = "https://api.openai.com";
    fs.writeFileSync(path.join(testDir, "config.json"), JSON.stringify(raw));

    const switched = {
      ...manager.load(),
      llm: { provider: "openai" as const, openaiApiKey: "openai-key", openaiModel: "gpt-4-turbo", openaiEndpoint: "https://api.openai.com" },
    };
    manager.save(switched);

    const saved = JSON.parse(fs.readFileSync(path.join(testDir, "config.json"), "utf-8"));
    expect(saved.llm.provider).toBe("openai");
    expect(saved.llm.endpoint).toBe("https://foundry.com");
    expect(saved.llm.apiKey).toMatch(/^enc:/);
  });
});
