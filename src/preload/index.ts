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

export interface VoxAPI {
  config: {
    load(): Promise<import("../shared/config").VoxConfig>;
    save(config: import("../shared/config").VoxConfig): Promise<void>;
  };
  models: {
    list(): Promise<ModelInfo[]>;
    download(size: string): Promise<void>;
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
}

const voxApi: VoxAPI = {
  config: {
    load: () => ipcRenderer.invoke("config:load"),
    save: (config) => ipcRenderer.invoke("config:save", config),
  },
  models: {
    list: () => ipcRenderer.invoke("models:list"),
    download: (size) => ipcRenderer.invoke("models:download", size),
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
};

contextBridge.exposeInMainWorld("voxApi", voxApi);
