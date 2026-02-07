import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { ConfigManager } from "../../../src/main/config/manager";
import { createDefaultConfig } from "../../../src/shared/config";

describe("ConfigManager", () => {
  let testDir: string;
  let manager: ConfigManager;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "vox-test-"));
    manager = new ConfigManager(testDir);
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
    const nestedManager = new ConfigManager(nestedDir);
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
});
