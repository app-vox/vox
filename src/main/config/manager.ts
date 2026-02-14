import * as fs from "fs";
import * as path from "path";
import { app } from "electron";
import { type VoxConfig, type LlmConfig, createDefaultConfig } from "../../shared/config";

export interface SecretStore {
  encrypt(plainText: string): string;
  decrypt(cipherText: string): string;
}

const SENSITIVE_FIELDS: (keyof LlmConfig)[] = ["apiKey", "secretAccessKey", "accessKeyId"];

export class ConfigManager {
  private readonly configPath: string;
  private readonly secrets: SecretStore;

  constructor(configDir: string, secrets: SecretStore) {
    this.configPath = path.join(configDir, "config.json");
    this.secrets = secrets;
  }

  load(): VoxConfig {
    const defaults = createDefaultConfig(app?.isPackaged ?? false);

    if (!fs.existsSync(this.configPath)) {
      return defaults;
    }

    try {
      const raw = fs.readFileSync(this.configPath, "utf-8");
      const saved = JSON.parse(raw);
      const config: VoxConfig = {
        llm: { ...defaults.llm, ...saved.llm },
        whisper: { ...defaults.whisper, ...saved.whisper },
        shortcuts: { ...defaults.shortcuts, ...saved.shortcuts },
        theme: saved.theme ?? defaults.theme,
        enableLlmEnhancement: saved.enableLlmEnhancement ?? defaults.enableLlmEnhancement,
        customPrompt: saved.customPrompt ?? defaults.customPrompt,
        launchAtLogin: saved.launchAtLogin ?? defaults.launchAtLogin,
        dictionary: Array.isArray(saved.dictionary) ? saved.dictionary : defaults.dictionary,
        language: saved.language ?? defaults.language,
        recordingAudioCue: saved.recordingAudioCue ?? defaults.recordingAudioCue,
      };

      for (const field of SENSITIVE_FIELDS) {
        const value = config.llm[field];
        if (typeof value === "string" && value) {
          (config.llm as unknown as Record<string, string>)[field] = this.secrets.decrypt(value);
        }
      }

      return config;
    } catch {
      return defaults;
    }
  }

  save(config: VoxConfig): void {
    const dir = path.dirname(this.configPath);
    fs.mkdirSync(dir, { recursive: true });

    const toWrite = structuredClone(config);

    for (const field of SENSITIVE_FIELDS) {
      const value = toWrite.llm[field];
      if (typeof value === "string" && value) {
        (toWrite.llm as unknown as Record<string, string>)[field] = this.secrets.encrypt(value);
      }
    }

    fs.writeFileSync(this.configPath, JSON.stringify(toWrite, null, 2), "utf-8");
  }
}
