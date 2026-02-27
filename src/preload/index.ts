import { contextBridge, ipcRenderer } from "electron";

export interface ModelInfo {
  size: string;
  info: { description: string; sizeBytes: number; label: string };
  downloaded: boolean;
}

export interface PermissionsStatus {
  microphone: string;
  accessibility: boolean | string;
  pid: number;
  execPath: string;
  bundleId: string;
}

export interface KeychainStatus {
  available: boolean;
  encryptedCount: number;
}

export interface TranscribeResult {
  rawText: string;
  correctedText: string | null;
  llmError: string | null;
}

export interface DownloadProgress {
  size: string;
  downloaded: number;
  total: number;
}

export interface UpdateState {
  status: "idle" | "checking" | "available" | "downloading" | "ready" | "error";
  currentVersion: string;
  latestVersion: string;
  releaseUrl: string;
  downloadProgress: number;
  error: string;
}

export interface VoxAPI {
  config: {
    load(): Promise<import("../shared/config").VoxConfig>;
    loadLlmForProvider(provider: import("../shared/config").LlmProviderType): Promise<import("../shared/config").LlmConfig>;
    save(config: import("../shared/config").VoxConfig): Promise<void>;
    onConfigChanged(callback: () => void): () => void;
  };
  models: {
    list(): Promise<ModelInfo[]>;
    download(size: string): Promise<void>;
    cancelDownload(size: string): Promise<void>;
    delete(size: string): Promise<void>;
    onDownloadProgress(callback: (progress: DownloadProgress) => void): () => void;
  };
  shortcuts: {
    disable(): Promise<void>;
    enable(immediate?: boolean): Promise<void>;
    startRecording(): void;
    stopRecording(): void;
    onKey(handler: (data: { code: string; key: string; alt: boolean; shift: boolean; control: boolean; meta: boolean }) => void): () => void;
  };
  llm: {
    test(config: import("../shared/config").VoxConfig): Promise<{ ok: boolean; error?: string }>;
  };
  whisper: {
    test(durationSec: number): Promise<string>;
  };
  pipeline: {
    testTranscribe(durationSec: number): Promise<TranscribeResult>;
    onResult(callback: (text: string) => void): () => void;
  };
  permissions: {
    status(): Promise<PermissionsStatus>;
    keychainStatus(): Promise<KeychainStatus>;
    requestMicrophone(): Promise<boolean>;
    requestAccessibility(): Promise<void>;
  };
  resources: {
    dataUrl(...segments: string[]): Promise<string>;
  };
  theme: {
    getSystemDark(): Promise<boolean>;
    onSystemThemeChanged(callback: (isDark: boolean) => void): void;
  };
  clipboard: {
    write(text: string): Promise<void>;
  };
  shell: {
    openExternal(url: string): Promise<void>;
  };
  setup: {
    check(): Promise<{ hasAnyModel: boolean; downloadedModels: string[] }>;
  };
  updates: {
    check(): Promise<void>;
    getState(): Promise<UpdateState>;
    getVersion(): Promise<string>;
    quitAndInstall(): Promise<void>;
    onStateChanged(callback: (state: UpdateState) => void): () => void;
  };
  history: {
    get(params: { offset: number; limit: number }): Promise<{ entries: import("../shared/types").TranscriptionEntry[]; total: number }>;
    search(params: { query: string; offset: number; limit: number }): Promise<{ entries: import("../shared/types").TranscriptionEntry[]; total: number }>;
    add(entry: { text: string; originalText: string; audioDurationMs: number; whisperModel: string; llmEnhanced: boolean }): Promise<void>;
    deleteEntry(id: string): Promise<void>;
    clear(): Promise<void>;
    onEntryAdded(callback: () => void): void;
  };
  navigation: {
    onNavigateTab(callback: (tab: string) => void): void;
  };
  audio: {
    previewCue(cueType: string): Promise<void>;
  };
  hud: {
    setPosition(nx: number, ny: number): Promise<void>;
    showHighlight(): Promise<void>;
    hideHighlight(): Promise<void>;
  };
  displays: {
    getAll(): Promise<{ id: number; label: string; bounds: { x: number; y: number; width: number; height: number }; primary: boolean }[]>;
  };
  i18n: {
    getSystemLocale(): Promise<string>;
  };
  dev: {
    getRuntimeState(): Promise<{
      shortcutState: string;
      isRecording: boolean;
      hudVisible: boolean;
      hudState: string;
      isListening: boolean;
      hasModel: boolean;
      trayActive: boolean;
    }>;
    getSystemInfo(): Promise<{
      electronVersion: string;
      nodeVersion: string;
      chromeVersion: string;
      v8Version: string;
      platform: string;
      arch: string;
      isPackaged: boolean;
      appVersion: string;
      appPath: string;
      userDataPath: string;
      logsPath: string;
      logLevelFile: string;
      logLevelConsole: string;
      whisperLib: string;
    }>;
    setAnalyticsEnabled(enabled: boolean): Promise<boolean>;
    setModelOverride(hasModel: boolean | null): Promise<void>;
    setLlmOverride(enabled: boolean | null, tested: boolean | null): Promise<void>;
    testError(): Promise<void>;
  };
  analytics: {
    track(event: string, properties?: Record<string, unknown>): Promise<void>;
  };
}

const voxApi: VoxAPI = {
  config: {
    load: () => ipcRenderer.invoke("config:load"),
    loadLlmForProvider: (provider) => ipcRenderer.invoke("config:load-llm-for-provider", provider),
    save: (config) => ipcRenderer.invoke("config:save", config),
    onConfigChanged: (callback) => {
      const handler = () => callback();
      ipcRenderer.on("config:changed", handler);
      return () => ipcRenderer.removeListener("config:changed", handler);
    },
  },
  models: {
    list: () => ipcRenderer.invoke("models:list"),
    download: (size) => ipcRenderer.invoke("models:download", size),
    cancelDownload: (size) => ipcRenderer.invoke("models:cancel-download", size),
    delete: (size) => ipcRenderer.invoke("models:delete", size),
    onDownloadProgress: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, progress: DownloadProgress) => callback(progress);
      ipcRenderer.on("models:download-progress", handler);
      return () => ipcRenderer.removeListener("models:download-progress", handler);
    },
  },
  shortcuts: {
    disable: () => ipcRenderer.invoke("shortcuts:disable"),
    enable: (immediate?: boolean) => ipcRenderer.invoke("shortcuts:enable", immediate),
    startRecording: () => ipcRenderer.send("shortcut-recorder:start"),
    stopRecording: () => ipcRenderer.send("shortcut-recorder:stop"),
    onKey: (handler: (data: { code: string; key: string; alt: boolean; shift: boolean; control: boolean; meta: boolean }) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: { code: string; key: string; alt: boolean; shift: boolean; control: boolean; meta: boolean }) => handler(data);
      ipcRenderer.on("shortcut-recorder:key", listener);
      return () => ipcRenderer.removeListener("shortcut-recorder:key", listener);
    },
  },
  llm: {
    test: (config) => ipcRenderer.invoke("llm:test", config),
  },
  whisper: {
    test: (durationSec) => ipcRenderer.invoke("whisper:test", durationSec),
  },
  pipeline: {
    testTranscribe: (durationSec) => ipcRenderer.invoke("test:transcribe", durationSec),
    onResult: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, text: string) => callback(text);
      ipcRenderer.on("pipeline:result", handler);
      return () => ipcRenderer.removeListener("pipeline:result", handler);
    },
  },
  permissions: {
    status: () => ipcRenderer.invoke("permissions:status"),
    keychainStatus: () => ipcRenderer.invoke("permissions:keychain-status"),
    requestMicrophone: () => ipcRenderer.invoke("permissions:request-microphone"),
    requestAccessibility: () => ipcRenderer.invoke("permissions:request-accessibility"),
  },
  resources: {
    dataUrl: (...segments) => ipcRenderer.invoke("resources:data-url", ...segments),
  },
  theme: {
    getSystemDark: () => ipcRenderer.invoke("theme:system-dark"),
    onSystemThemeChanged: (callback) => {
      ipcRenderer.on("theme:system-changed", (_event, isDark: boolean) => callback(isDark));
    },
  },
  clipboard: {
    write: (text) => ipcRenderer.invoke("clipboard:write", text),
  },
  shell: {
    openExternal: (url) => ipcRenderer.invoke("shell:open-external", url),
  },
  setup: {
    check: () => ipcRenderer.invoke("setup:check"),
  },
  updates: {
    check: () => ipcRenderer.invoke("updates:check"),
    getState: () => ipcRenderer.invoke("updates:get-state"),
    getVersion: () => ipcRenderer.invoke("updates:get-version"),
    quitAndInstall: () => ipcRenderer.invoke("updates:quit-and-install"),
    onStateChanged: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, state: UpdateState) => callback(state);
      ipcRenderer.on("updates:state-changed", handler);
      return () => ipcRenderer.removeListener("updates:state-changed", handler);
    },
  },
  history: {
    get: (params) => ipcRenderer.invoke("history:get", params),
    search: (params) => ipcRenderer.invoke("history:search", params),
    add: (entry) => ipcRenderer.invoke("history:add", entry),
    deleteEntry: (id) => ipcRenderer.invoke("history:delete-entry", id),
    clear: () => ipcRenderer.invoke("history:clear"),
    onEntryAdded: (callback) => {
      ipcRenderer.on("history:entry-added", () => callback());
    },
  },
  navigation: {
    onNavigateTab: (callback) => {
      ipcRenderer.on("navigate-tab", (_event, tab: string) => callback(tab));
    },
  },
  audio: {
    previewCue: (cueType) => ipcRenderer.invoke("audio:preview-cue", cueType),
  },
  hud: {
    setPosition: (nx, ny) => ipcRenderer.invoke("hud:set-position", nx, ny),
    showHighlight: () => ipcRenderer.invoke("hud:show-highlight"),
    hideHighlight: () => ipcRenderer.invoke("hud:hide-highlight"),
  },
  displays: {
    getAll: () => ipcRenderer.invoke("displays:get-all"),
  },
  i18n: {
    getSystemLocale: () => ipcRenderer.invoke("i18n:system-locale"),
  },
  dev: {
    getRuntimeState: () => ipcRenderer.invoke("dev:get-runtime-state"),
    getSystemInfo: () => ipcRenderer.invoke("dev:get-system-info"),
    setAnalyticsEnabled: (enabled: boolean) => ipcRenderer.invoke("dev:set-analytics-enabled", enabled),
    setModelOverride: (hasModel: boolean | null) => ipcRenderer.invoke("dev:set-model-override", hasModel),
    setLlmOverride: (enabled: boolean | null, tested: boolean | null) => ipcRenderer.invoke("dev:set-llm-override", enabled, tested),
    testError: () => ipcRenderer.invoke("dev:test-error"),
  },
  analytics: {
    track: (event: string, properties?: Record<string, unknown>) =>
      ipcRenderer.invoke("analytics:track", event, properties),
  },
};

contextBridge.exposeInMainWorld("voxApi", voxApi);

contextBridge.exposeInMainWorld("electronAPI", {
  cancelRecording: () => ipcRenderer.invoke("indicator:cancel-recording"),
  undoCancelRecording: () => ipcRenderer.invoke("indicator:undo-cancel"),
  pauseCancelTimer: () => ipcRenderer.invoke("indicator:pause-cancel"),
  resumeCancelTimer: (remainMs: number) => ipcRenderer.invoke("indicator:resume-cancel", remainMs),
  hudStartRecording: () => ipcRenderer.invoke("hud:start-recording"),
  hudStopRecording: () => ipcRenderer.invoke("hud:stop-recording"),
  hudOpenSettings: () => ipcRenderer.invoke("hud:open-settings"),
  hudOpenTranscriptions: () => ipcRenderer.invoke("hud:open-transcriptions"),
  hudDisable: () => ipcRenderer.invoke("hud:disable"),
  hudDrag: (dx: number, dy: number) => ipcRenderer.invoke("hud:drag", dx, dy),
  hudDragEnd: () => ipcRenderer.invoke("hud:drag-end"),
  setIgnoreMouseEvents: (ignore: boolean) => ipcRenderer.invoke("hud:set-ignore-mouse", ignore),
  hudCopyLatest: () => ipcRenderer.invoke("hud:copy-latest"),
  hudDismiss: () => ipcRenderer.invoke("hud:dismiss"),
  pauseFlashTimer: () => ipcRenderer.invoke("hud:pause-flash"),
  resumeFlashTimer: () => ipcRenderer.invoke("hud:resume-flash"),
});
