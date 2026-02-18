import * as fs from "fs";
import * as path from "path";
import { app } from "electron";
import { type VoxConfig, type LlmConfigFlat, type WidgetPosition, createDefaultConfig, createDefaultLlmFlat, narrowLlmConfig } from "../../shared/config";
import { resolveWhisperLanguage } from "../../shared/constants";
import { ENCRYPTED_PREFIX } from "./secrets";

export function migrateHudPosition(raw: string | undefined): WidgetPosition {
  if (!raw) return "bottom-center";
  if (raw.includes("-") || raw === "custom") return raw as WidgetPosition;
  const map: Record<string, WidgetPosition> = {
    left: "bottom-left",
    center: "bottom-center",
    right: "bottom-right",
  };
  return map[raw] ?? "bottom-center";
}

export interface SecretStore {
  encrypt(plainText: string): string;
  decrypt(cipherText: string): string;
}

export const SENSITIVE_FIELDS: (keyof LlmConfigFlat)[] = ["apiKey", "secretAccessKey", "accessKeyId", "openaiApiKey", "anthropicApiKey", "customToken"];

export class ConfigManager {
  private readonly configPath: string;
  private readonly secrets: SecretStore;

  constructor(configDir: string, secrets: SecretStore) {
    this.configPath = path.join(configDir, "config.json");
    this.secrets = secrets;
  }

  load(): VoxConfig {
    const defaults = createDefaultConfig(app?.isPackaged ?? false);
    const defaultsFlat = createDefaultLlmFlat();

    let config: VoxConfig;

    if (!fs.existsSync(this.configPath)) {
      config = defaults;
    } else {
      try {
        const raw = fs.readFileSync(this.configPath, "utf-8");
        const saved = JSON.parse(raw);

        const llmFlat: LlmConfigFlat = { ...defaultsFlat, ...saved.llm };

        for (const field of SENSITIVE_FIELDS) {
          const value = (llmFlat as Record<string, unknown>)[field];
          if (typeof value === "string" && value) {
            (llmFlat as Record<string, string>)[field] = this.secrets.decrypt(value);
          }
        }

        config = {
          llm: narrowLlmConfig(llmFlat),
          whisper: { ...defaults.whisper, ...saved.whisper },
          shortcuts: { ...defaults.shortcuts, ...saved.shortcuts },
          theme: saved.theme ?? defaults.theme,
          enableLlmEnhancement: saved.enableLlmEnhancement ?? defaults.enableLlmEnhancement,
          customPrompt: saved.customPrompt ?? defaults.customPrompt,
          launchAtLogin: saved.launchAtLogin ?? defaults.launchAtLogin,
          dictionary: Array.isArray(saved.dictionary) ? saved.dictionary : defaults.dictionary,
          speechLanguages: Array.isArray(saved.speechLanguages) ? saved.speechLanguages : defaults.speechLanguages,
          language: saved.language ?? defaults.language,
          recordingAudioCue: saved.recordingAudioCue ?? defaults.recordingAudioCue,
          recordingStopAudioCue: saved.recordingStopAudioCue ?? defaults.recordingStopAudioCue,
          errorAudioCue: saved.errorAudioCue ?? defaults.errorAudioCue,
          llmConnectionTested: saved.llmConnectionTested ?? defaults.llmConnectionTested,
          llmConfigHash: saved.llmConfigHash ?? defaults.llmConfigHash,
          analyticsEnabled: saved.analyticsEnabled ?? defaults.analyticsEnabled,
          showHud: saved.showHud ?? defaults.showHud,
          hudShowOnHover: saved.hudShowOnHover ?? defaults.hudShowOnHover,
          showHudActions: saved.showHudActions ?? defaults.showHudActions,
          hudPosition: migrateHudPosition(saved.hudPosition ?? saved.overlayPosition),
          hudCustomX: saved.hudCustomX ?? saved.overlayCustomX ?? defaults.hudCustomX,
          hudCustomY: saved.hudCustomY ?? saved.overlayCustomY ?? defaults.hudCustomY,
          targetDisplayId: saved.targetDisplayId ?? defaults.targetDisplayId,
          reduceAnimations: saved.reduceAnimations ?? defaults.reduceAnimations,
          reduceVisualEffects: saved.reduceVisualEffects ?? defaults.reduceVisualEffects,
          onboardingCompleted: saved.onboardingCompleted ?? true,
        };
      } catch {
        config = defaults;
      }
    }

    if (config.speechLanguages.length === 0) {
      const resolved = resolveWhisperLanguage(app?.getLocale?.() ?? "");
      if (resolved) config.speechLanguages = [resolved];
    }

    return config;
  }

  save(config: VoxConfig): void {
    const dir = path.dirname(this.configPath);
    fs.mkdirSync(dir, { recursive: true });

    let existingLlmFlat: LlmConfigFlat = createDefaultLlmFlat();
    if (fs.existsSync(this.configPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(this.configPath, "utf-8"));
        if (raw.llm) {
          existingLlmFlat = { ...existingLlmFlat, ...raw.llm };
          for (const field of SENSITIVE_FIELDS) {
            const value = (existingLlmFlat as Record<string, unknown>)[field];
            if (typeof value === "string" && value) {
              (existingLlmFlat as Record<string, string>)[field] = this.secrets.decrypt(value);
            }
          }
        }
      } catch { /* use defaults */ }
    }

    const llmFlat: LlmConfigFlat = { ...existingLlmFlat, ...config.llm };

    const toWriteFlat = { ...llmFlat };
    for (const field of SENSITIVE_FIELDS) {
      const value = (toWriteFlat as Record<string, unknown>)[field];
      if (typeof value === "string" && value) {
        (toWriteFlat as Record<string, string>)[field] = this.secrets.encrypt(value);
      }
    }

    const toWrite = structuredClone({ ...config, llm: toWriteFlat });

    fs.writeFileSync(this.configPath, JSON.stringify(toWrite, null, 2), "utf-8");
  }

  countEncryptedSecrets(): number {
    if (!fs.existsSync(this.configPath)) return 0;
    try {
      const raw = JSON.parse(fs.readFileSync(this.configPath, "utf-8"));
      if (!raw.llm) return 0;
      return SENSITIVE_FIELDS.filter((field) => {
        const value = raw.llm[field];
        return typeof value === "string" && value.startsWith(ENCRYPTED_PREFIX);
      }).length;
    } catch {
      return 0;
    }
  }
}
