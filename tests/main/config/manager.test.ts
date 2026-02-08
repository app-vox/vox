import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { ConfigManager, type SecretStore } from "../../../src/main/config/manager";
import { createDefaultConfig } from "../../../src/shared/config";

function createMockSecretStore(): SecretStore {
  return {
    encrypt: (v: string) => `enc:${Buffer.from(v).toString("base64")}`,
    decrypt: (v: string) => v.startsWith("enc:") ? Buffer.from(v.slice(4), "base64").toString() : v,
  };
}

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
    config.llm.endpoint = "https://my-foundry.example.com";
    config.whisper.model = "medium";

    manager.save(config);
    const loaded = manager.load();

    expect(loaded.llm.endpoint).toBe("https://my-foundry.example.com");
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
    fs.writeFileSync(
      path.join(testDir, "config.json"),
      JSON.stringify(partialConfig),
    );

    const loaded = manager.load();

    expect(loaded.llm.endpoint).toBe("https://test.com");
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
    fs.writeFileSync(
      path.join(testDir, "config.json"),
      JSON.stringify(oldConfig),
    );

    const loaded = manager.load();

    expect(loaded.llm.provider).toBe("foundry");
    expect(loaded.llm.endpoint).toBe("https://old.com");
    expect(loaded.llm.region).toBe("us-east-1");
    expect(loaded.llm.accessKeyId).toBe("");
    expect(loaded.llm.secretAccessKey).toBe("");
    expect(loaded.llm.modelId).toBe("anthropic.claude-3-5-sonnet-20241022-v2:0");
  });

  it("should encrypt sensitive fields on save", () => {
    const config = createDefaultConfig();
    config.llm.apiKey = "my-secret-key";
    config.llm.secretAccessKey = "aws-secret";
    config.llm.accessKeyId = "AKIA123";

    manager.save(config);

    const raw = JSON.parse(fs.readFileSync(path.join(testDir, "config.json"), "utf-8"));
    expect(raw.llm.apiKey).toMatch(/^enc:/);
    expect(raw.llm.secretAccessKey).toMatch(/^enc:/);
    expect(raw.llm.accessKeyId).toMatch(/^enc:/);
    expect(raw.llm.endpoint).toBe("");
  });

  it("should decrypt sensitive fields on load", () => {
    const config = createDefaultConfig();
    config.llm.apiKey = "my-secret-key";
    config.llm.secretAccessKey = "aws-secret";
    config.llm.accessKeyId = "AKIA123";

    manager.save(config);
    const loaded = manager.load();

    expect(loaded.llm.apiKey).toBe("my-secret-key");
    expect(loaded.llm.secretAccessKey).toBe("aws-secret");
    expect(loaded.llm.accessKeyId).toBe("AKIA123");
  });

  it("should transparently migrate plaintext config to encrypted", () => {
    const plainConfig = {
      llm: {
        provider: "foundry",
        endpoint: "https://test.com",
        apiKey: "plaintext-key",
        model: "gpt-4o",
        region: "us-east-1",
        profile: "",
        accessKeyId: "",
        secretAccessKey: "",
        modelId: "",
      },
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
    expect(raw.llm.secretAccessKey).toBe("");
    expect(raw.llm.accessKeyId).toBe("");
  });
});
