import { contextBridge, ipcRenderer } from "electron";

export interface AudioRecording {
  audioBuffer: number[];
  sampleRate: number;
}

export interface ModelInfo {
  size: string;
  info: { description: string; sizeBytes: number };
  downloaded: boolean;
}

export interface PermissionsStatus {
  microphone: string;
  accessibility: boolean | string;
  pid: number;
  execPath: string;
  bundleId: string;
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
    save(config: import("../shared/config").VoxConfig): Promise<void>;
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
    enable(): Promise<void>;
  };
  llm: {
    test(): Promise<{ ok: boolean; error?: string }>;
  };
  whisper: {
    test(recording: AudioRecording): Promise<string>;
  };
  pipeline: {
    testTranscribe(recording: AudioRecording): Promise<TranscribeResult>;
  };
  permissions: {
    status(): Promise<PermissionsStatus>;
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
}

const voxApi: VoxAPI = {
  config: {
    load: () => ipcRenderer.invoke("config:load"),
    save: (config) => ipcRenderer.invoke("config:save", config),
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
    enable: () => ipcRenderer.invoke("shortcuts:enable"),
  },
  llm: {
    test: () => ipcRenderer.invoke("llm:test"),
  },
  whisper: {
    test: (recording) => ipcRenderer.invoke("whisper:test", recording),
  },
  pipeline: {
    testTranscribe: (recording) => ipcRenderer.invoke("test:transcribe", recording),
  },
  permissions: {
    status: () => ipcRenderer.invoke("permissions:status"),
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
};

contextBridge.exposeInMainWorld("voxApi", voxApi);
