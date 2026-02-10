import { app, Tray, Menu, nativeImage, shell } from "electron";
import { getResourcePath } from "./resources";
import { type VoxConfig, type WhisperModelSize } from "../shared/config";
import { getUpdateState, quitAndInstall } from "./updater";

let tray: Tray | null = null;

export interface TrayCallbacks {
  onOpenHome: () => void;
  onStartListening?: () => void;
  onStopListening?: () => void;
  onCancelListening?: () => void;
}

let callbacks: TrayCallbacks | null = null;
let isListening = false;
let hasModel = true;
let currentConfig: VoxConfig | null = null;

const SPEECH_QUALITY_LABELS: Record<WhisperModelSize, string> = {
  tiny: "Fastest",
  base: "Fast",
  small: "Balanced",
  medium: "Accurate",
  large: "Best",
};

function getActiveModelName(config: VoxConfig): string {
  switch (config.llm.provider) {
    case "bedrock":
      return config.llm.modelId;
    case "openai":
    case "deepseek":
    case "litellm":
      return config.llm.openaiModel;
    case "foundry":
    default:
      return config.llm.model;
  }
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
      label: "Show Vox",
      click: callbacks.onOpenHome,
    },
  ];

  // Status section
  if (currentConfig) {
    menuTemplate.push(
      { type: "separator" },
      {
        label: `Speech: ${currentConfig.whisper.model ? SPEECH_QUALITY_LABELS[currentConfig.whisper.model] : "No model"}`,
        enabled: false,
      },
      {
        label: currentConfig.enableLlmEnhancement
          ? `AI Enhancement: ${getActiveModelName(currentConfig)}`
          : "AI Enhancement: Off",
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
          label: "Complete Listening",
          click: callbacks.onStopListening,
          enabled: hasModel,
        });
      }
      if (callbacks.onCancelListening) {
        menuTemplate.push({
          label: "Cancel",
          click: callbacks.onCancelListening,
          enabled: hasModel,
        });
      }
    }
  } else {
    if (callbacks.onStartListening) {
      menuTemplate.push({ type: "separator" });
      menuTemplate.push({
        label: "Start Listening",
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
        label: `Restart to Update (v${updateState.latestVersion})`,
        click: () => quitAndInstall(),
      },
    );
  } else if (updateState.status === "downloading") {
    menuTemplate.push(
      { type: "separator" },
      {
        label: "Downloading Update...",
        enabled: false,
      },
    );
  } else if (updateState.status === "available") {
    menuTemplate.push(
      { type: "separator" },
      {
        label: `Update to v${updateState.latestVersion}`,
        click: () => shell.openExternal(updateState.releaseUrl),
      },
    );
  }

  menuTemplate.push(
    { type: "separator" },
    {
      label: "Report Issue",
      click: () => shell.openExternal("https://github.com/app-vox/vox/issues"),
    },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() }
  );

  const contextMenu = Menu.buildFromTemplate(menuTemplate);
  tray.setContextMenu(contextMenu);
}
