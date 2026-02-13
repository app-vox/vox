import { app, Tray, Menu, nativeImage, shell } from "electron";
import { getResourcePath } from "./resources";
import { type VoxConfig } from "../shared/config";
import { getUpdateState, quitAndInstall } from "./updater";
import { t } from "../shared/i18n";

let tray: Tray | null = null;

export interface TrayCallbacks {
  onOpenHome: () => void;
  onOpenHistory?: () => void;
  onStartListening?: () => void;
  onStopListening?: () => void;
  onCancelListening?: () => void;
}

let callbacks: TrayCallbacks | null = null;
let isListening = false;
let hasModel = true;
let currentConfig: VoxConfig | null = null;

function simplifyModelName(fullName: string): string {
  // Extract meaningful parts from complex model names
  // Examples:
  // "global.anthropic.claude-sonnet-4-5-20250929-v1" -> "claude-sonnet-4.5"
  // "anthropic.claude-3-5-sonnet-20241022-v2:0" -> "claude-3.5-sonnet"
  // "gpt-4-turbo-2024-04-09" -> "gpt-4-turbo"
  // "meta.llama3-70b-instruct-v1:0" -> "llama3-70b"

  // Remove common prefixes (provider namespaces and routing)
  let simplified = fullName
    .replace(/^(global\.|local\.|remote\.)/, "")
    .replace(/^(anthropic\.|meta\.|amazon\.|cohere\.|mistral\.|ai21\.)/, "");

  // Extract core model name and simplify
  const patterns = [
    // Claude pattern: claude-sonnet-X-Y-YYYYMMDD-vN -> claude-sonnet-X.Y
    /^claude-(\w+)-(\d+)-(\d+)-\d{8}-v\d+$/,
    // Claude pattern old: claude-X-Y-sonnet-YYYYMMDD-vN:0 -> claude-X.Y-sonnet
    /^claude-(\d+)-(\d+)-(\w+)-\d{8}-v\d+:?\d*$/,
    // GPT pattern: gpt-X-variant-YYYY-MM-DD -> gpt-X-variant
    /^(gpt-\d+(?:-\w+)?)-\d{4}-\d{2}-\d{2}$/,
    // Llama pattern: llamaX-XXb-instruct-vN:0 -> llamaX-XXb
    /^(llama\d+-\d+b)(?:-\w+)?-v\d+:?\d*$/,
  ];

  // Try specific patterns
  let match = simplified.match(patterns[0]);
  if (match) {
    // claude-sonnet-4-5 -> claude-sonnet-4.5
    return `claude-${match[1]}-${match[2]}.${match[3]}`;
  }

  match = simplified.match(patterns[1]);
  if (match) {
    // claude-3-5-sonnet -> claude-3.5-sonnet
    return `claude-${match[1]}.${match[2]}-${match[3]}`;
  }

  match = simplified.match(patterns[2]);
  if (match) {
    return match[1];
  }

  match = simplified.match(patterns[3]);
  if (match) {
    return match[1];
  }

  // Fallback: remove trailing version identifiers and dates
  simplified = simplified
    .replace(/:\d+$/, "") // Remove trailing :0
    .replace(/-v\d+$/, "") // Remove trailing -vN
    .replace(/-\d{8}$/, "") // Remove trailing date YYYYMMDD
    .replace(/-\d{4}-\d{2}-\d{2}$/, ""); // Remove trailing date YYYY-MM-DD

  return simplified;
}

function getActiveModelName(config: VoxConfig): string {
  let fullName: string;
  switch (config.llm.provider) {
    case "bedrock":
      fullName = config.llm.modelId;
      break;
    case "openai":
    case "deepseek":
    case "litellm":
      fullName = config.llm.openaiModel;
      break;
    case "foundry":
    default:
      fullName = config.llm.model;
      break;
  }
  return simplifyModelName(fullName);
}

export function setupTray(trayCallbacks: TrayCallbacks): void {
  callbacks = trayCallbacks;

  const iconPath = getResourcePath("trayIcon.png");
  let icon = nativeImage.createFromPath(iconPath);
  // Resize to 18x18 to provide better vertical alignment in macOS menu bar
  icon = icon.resize({ width: 18, height: 18 });
  icon.setTemplateImage(true);
  tray = new Tray(icon);

  updateTrayMenu();
}

export function setTrayListeningState(listening: boolean): void {
  isListening = listening;
  updateTrayMenu();
}

export function setTrayModelState(modelConfigured: boolean): void {
  hasModel = modelConfigured;
  updateTrayMenu();
}

export function updateTrayConfig(config: VoxConfig): void {
  currentConfig = config;
  updateTrayMenu();
}

export function updateTrayMenu(): void {
  if (!tray || !callbacks) return;

  const menuTemplate: Electron.MenuItemConstructorOptions[] = [
    {
      label: t("tray.showVox"),
      click: callbacks.onOpenHome,
    },
    {
      label: "Transcriptions",
      click: () => callbacks?.onOpenHistory?.(),
    },
  ];

  // Status section
  if (currentConfig) {
    menuTemplate.push(
      { type: "separator" },
      {
        label: currentConfig.whisper.model
          ? t("tray.speech", { quality: t("whisper.quality." + currentConfig.whisper.model) })
          : t("tray.speechNoModel"),
        enabled: false,
      },
      {
        label: currentConfig.enableLlmEnhancement
          ? t("tray.aiEnhancement", { model: getActiveModelName(currentConfig) })
          : t("tray.aiEnhancementOff"),
        enabled: false,
      },
    );
  }

  // Show different options based on recording state
  if (isListening) {
    if (callbacks.onStopListening || callbacks.onCancelListening) {
      menuTemplate.push({ type: "separator" });
      if (callbacks.onStopListening) {
        menuTemplate.push({
          label: t("tray.completeListening"),
          click: callbacks.onStopListening,
          enabled: hasModel,
        });
      }
      if (callbacks.onCancelListening) {
        menuTemplate.push({
          label: t("tray.cancel"),
          click: callbacks.onCancelListening,
          enabled: hasModel,
        });
      }
    }
  } else {
    if (callbacks.onStartListening) {
      menuTemplate.push({ type: "separator" });
      menuTemplate.push({
        label: t("tray.startListening"),
        click: callbacks.onStartListening,
        enabled: hasModel,
      });
    }
  }

  // Update notification
  const updateState = getUpdateState();
  if (updateState.status === "ready") {
    menuTemplate.push(
      { type: "separator" },
      {
        label: t("tray.restartToUpdate", { version: updateState.latestVersion }),
        click: () => quitAndInstall(),
      },
    );
  } else if (updateState.status === "downloading") {
    menuTemplate.push(
      { type: "separator" },
      {
        label: t("tray.downloadingUpdate"),
        enabled: false,
      },
    );
  } else if (updateState.status === "available") {
    menuTemplate.push(
      { type: "separator" },
      {
        label: t("tray.updateTo", { version: updateState.latestVersion }),
        click: () => shell.openExternal(updateState.releaseUrl),
      },
    );
  }

  menuTemplate.push(
    { type: "separator" },
    {
      label: t("tray.reportIssue"),
      click: () => shell.openExternal("https://github.com/app-vox/vox/issues"),
    },
    { type: "separator" },
    { label: t("tray.quit"), click: () => app.quit() }
  );

  const contextMenu = Menu.buildFromTemplate(menuTemplate);
  tray.setContextMenu(contextMenu);
}
