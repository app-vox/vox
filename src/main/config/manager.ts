import * as fs from "fs";
import * as path from "path";
import { type VoxConfig, createDefaultConfig } from "../../shared/config";

export class ConfigManager {
  private readonly configPath: string;

  constructor(configDir: string) {
    this.configPath = path.join(configDir, "config.json");
  }

  load(): VoxConfig {
    const defaults = createDefaultConfig();

    if (!fs.existsSync(this.configPath)) {
      return defaults;
    }

    try {
      const raw = fs.readFileSync(this.configPath, "utf-8");
      const saved = JSON.parse(raw);
      return {
        llm: { ...defaults.llm, ...saved.llm },
        whisper: { ...defaults.whisper, ...saved.whisper },
        shortcuts: { ...defaults.shortcuts, ...saved.shortcuts },
        theme: saved.theme ?? defaults.theme,
        enableLlmEnhancement: saved.enableLlmEnhancement ?? defaults.enableLlmEnhancement,
        customPrompt: saved.customPrompt ?? defaults.customPrompt,
      };
    } catch {
      return defaults;
    }
  }

  save(config: VoxConfig): void {
    const dir = path.dirname(this.configPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), "utf-8");
  }
}
