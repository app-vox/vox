import { vi } from "vitest";
import { render, type RenderOptions } from "@testing-library/react";
import { createElement, type ReactElement } from "react";
import { I18nProvider } from "../../../src/renderer/i18n-context";
import { useConfigStore } from "../../../src/renderer/stores/config-store";
import { useTranscriptionsStore } from "../../../src/renderer/stores/transcriptions-store";
import { useDevOverrides } from "../../../src/renderer/stores/dev-overrides-store";
import { useSaveToast } from "../../../src/renderer/hooks/use-save-toast";
import type { VoxAPI } from "../../../src/preload/index";

/**
 * Creates a fully-typed mock of window.voxApi where every method is a vi.fn().
 * Call this in beforeEach to get a fresh mock per test.
 */
export function createVoxApiMock(): VoxAPI {
  return {
    config: {
      load: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
    },
    models: {
      list: vi.fn().mockResolvedValue([]),
      download: vi.fn().mockResolvedValue(undefined),
      cancelDownload: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      onDownloadProgress: vi.fn().mockReturnValue(() => {}),
    },
    shortcuts: {
      disable: vi.fn().mockResolvedValue(undefined),
      enable: vi.fn().mockResolvedValue(undefined),
    },
    llm: {
      test: vi.fn().mockResolvedValue({ ok: true }),
    },
    whisper: {
      test: vi.fn().mockResolvedValue(""),
    },
    pipeline: {
      testTranscribe: vi.fn().mockResolvedValue({ rawText: "", correctedText: null, llmError: null }),
    },
    permissions: {
      status: vi.fn().mockResolvedValue({ microphone: "granted", accessibility: true, pid: 1, execPath: "", bundleId: "" }),
      keychainStatus: vi.fn().mockResolvedValue({ available: true, encryptedCount: 0 }),
      requestMicrophone: vi.fn().mockResolvedValue(true),
      requestAccessibility: vi.fn().mockResolvedValue(undefined),
    },
    resources: {
      dataUrl: vi.fn().mockResolvedValue(""),
    },
    theme: {
      getSystemDark: vi.fn().mockResolvedValue(false),
      onSystemThemeChanged: vi.fn(),
    },
    clipboard: {
      write: vi.fn().mockResolvedValue(undefined),
    },
    shell: {
      openExternal: vi.fn().mockResolvedValue(undefined),
    },
    setup: {
      check: vi.fn().mockResolvedValue({ hasAnyModel: true, downloadedModels: ["small"] }),
    },
    updates: {
      check: vi.fn().mockResolvedValue(undefined),
      getState: vi.fn().mockResolvedValue({ status: "idle", currentVersion: "1.0.0", latestVersion: "1.0.0", releaseUrl: "", downloadProgress: 0, error: "" }),
      getVersion: vi.fn().mockResolvedValue("1.0.0"),
      quitAndInstall: vi.fn().mockResolvedValue(undefined),
      onStateChanged: vi.fn().mockReturnValue(() => {}),
    },
    history: {
      get: vi.fn().mockResolvedValue({ entries: [], total: 0 }),
      search: vi.fn().mockResolvedValue({ entries: [], total: 0 }),
      add: vi.fn().mockResolvedValue(undefined),
      deleteEntry: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      onEntryAdded: vi.fn(),
    },
    navigation: {
      onNavigateTab: vi.fn(),
    },
    audio: {
      previewCue: vi.fn().mockResolvedValue(undefined),
    },
    indicator: {
      cancelRecording: vi.fn().mockResolvedValue(undefined),
    },
    i18n: {
      getSystemLocale: vi.fn().mockResolvedValue("en"),
    },
    dev: {
      getRuntimeState: vi.fn().mockResolvedValue({ shortcutState: "", isRecording: false, indicatorVisible: false, indicatorMode: null, isListening: false, hasModel: false, trayActive: false }),
      getSystemInfo: vi.fn().mockResolvedValue({ electronVersion: "", nodeVersion: "", chromeVersion: "", v8Version: "", platform: "", arch: "", isPackaged: false, appVersion: "", appPath: "", userDataPath: "", logsPath: "", logLevelFile: "", logLevelConsole: "", whisperLib: "" }),
    },
    analytics: {
      track: vi.fn().mockResolvedValue(undefined),
    },
  };
}

/**
 * Installs the voxApi mock on the global window object.
 * Returns the mock so tests can configure specific method behaviors.
 */
export function installVoxApiMock(): VoxAPI {
  const mock = createVoxApiMock();
  (globalThis as Record<string, unknown>).window ??= globalThis;
  (window as unknown as Record<string, unknown>).voxApi = mock;
  return mock;
}

/**
 * Resets all Zustand stores to their initial state.
 * Call in beforeEach to prevent cross-test contamination.
 */
export function resetStores(): void {
  useConfigStore.setState({
    config: null,
    loading: true,
    activeTab: "general",
    setupComplete: false,
    _hasSavedTab: false,
    _hasUserNavigated: false,
  });

  useTranscriptionsStore.setState({
    entries: [],
    total: 0,
    page: 1,
    pageSize: 10,
    searchQuery: "",
    loading: false,
  });

  useDevOverrides.setState({
    overrides: { enabled: false },
  });

  useSaveToast.setState({
    show: false,
    timestamp: 0,
  });
}

/**
 * Renders a component wrapped in the I18nProvider.
 * Use for component tests that need the t() function.
 */
export function renderWithI18n(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, {
    wrapper: ({ children }) => createElement(I18nProvider, null, children),
    ...options,
  });
}
