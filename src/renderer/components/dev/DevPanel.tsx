import { useState, useEffect, useCallback, type ReactNode } from "react";
import type { UpdateState, ModelInfo } from "../../../preload/index";
import { useConfigStore } from "../../stores/config-store";
import { useDevOverrides } from "../../stores/dev-overrides-store";
import { usePermissionsStore } from "../../stores/permissions-store";
import { useTranscriptionsStore } from "../../stores/transcriptions-store";
import { useOnlineStatus } from "../../hooks/use-online-status";
import { computeLlmConfigHash } from "../../../shared/llm-config-hash";
import { SUPPORTED_LANGUAGES } from "../../../shared/i18n";
import card from "../shared/card.module.scss";
import styles from "./DevPanel.module.scss";

interface RuntimeState {
  shortcutState: string;
  isRecording: boolean;
  indicatorVisible: boolean;
  indicatorMode: string | null;
  isListening: boolean;
  hasModel: boolean;
  trayActive: boolean;
}

function Dot({ color }: { color: "green" | "yellow" | "red" | "gray" }) {
  return <span className={`${styles.dot} ${styles[color]}`} />;
}

function StateRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.stateRow}>
      <span className={styles.stateLabel}>{label}</span>
      <span className={styles.stateValue}>{children}</span>
    </div>
  );
}

function boolDot(val: boolean | undefined | null): ReactNode {
  if (val === true) return <><Dot color="green" />true</>;
  if (val === false) return <><Dot color="red" />false</>;
  return <><Dot color="gray" />unknown</>;
}

function statusDot(val: string | undefined | null): ReactNode {
  if (!val) return <><Dot color="gray" />none</>;
  if (val === "granted" || val === "idle" || val === "ready") return <><Dot color="green" />{val}</>;
  if (val === "denied" || val === "error") return <><Dot color="red" />{val}</>;
  if (val === "not-determined" || val === "checking" || val === "downloading") return <><Dot color="yellow" />{val}</>;
  return <><Dot color="gray" />{val}</>;
}

export function DevPanel() {
  const config = useConfigStore((s) => s.config);
  const activeTab = useConfigStore((s) => s.activeTab);
  const setupComplete = useConfigStore((s) => s.setupComplete);

  const overrides = useDevOverrides((s) => s.overrides);
  const setEnabled = useDevOverrides((s) => s.setEnabled);

  const permStatus = usePermissionsStore((s) => s.status);
  const refreshPerms = usePermissionsStore((s) => s.refresh);

  const transcriptionTotal = useTranscriptionsStore((s) => s.total);
  const transcriptionPage = useTranscriptionsStore((s) => s.page);
  const transcriptionPageSize = useTranscriptionsStore((s) => s.pageSize);
  const transcriptionSearch = useTranscriptionsStore((s) => s.searchQuery);

  const online = useOnlineStatus();

  const [runtime, setRuntime] = useState<RuntimeState | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [updateState, setUpdateState] = useState<UpdateState | null>(null);
  const [version, setVersion] = useState("");
  const [systemLocale, setSystemLocale] = useState("");

  const collapsed = typeof window !== "undefined"
    ? localStorage.getItem("vox:sidebar-collapsed") === "true"
    : false;

  const fetchRuntime = useCallback(async () => {
    try {
      const state = await window.voxApi.dev.getRuntimeState();
      setRuntime(state);
    } catch {
      // dev IPC may not be available
    }
  }, []);

  const fetchModels = useCallback(async () => {
    try {
      const list = await window.voxApi.models.list();
      setModels(list);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchRuntime();
    fetchModels();
    window.voxApi.updates.getState().then(setUpdateState);
    window.voxApi.updates.getVersion().then(setVersion);
    window.voxApi.i18n.getSystemLocale().then(setSystemLocale);
    if (!permStatus) refreshPerms();
  }, [fetchRuntime, fetchModels, permStatus, refreshPerms]);

  useEffect(() => {
    return window.voxApi.updates.onStateChanged(setUpdateState);
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchRuntime, 1000);
    return () => clearInterval(interval);
  }, [fetchRuntime]);

  const downloadedModels = models.filter((m) => m.downloaded).map((m) => m.size);
  const selectedModel = config?.whisper?.model || "(none)";

  const llmProvider = config?.llm?.provider || "unknown";
  const llmEnhancement = config?.enableLlmEnhancement ?? false;
  const llmConnectionTested = config?.llmConnectionTested ?? false;
  const llmConfigHash = config?.llmConfigHash || "(empty)";
  const currentHash = config ? computeLlmConfigHash(config) : "";
  const hashMatch = llmConfigHash === currentHash;
  const customPrompt = config?.customPrompt ? `"${config.customPrompt.slice(0, 40)}${config.customPrompt.length > 40 ? "..." : ""}"` : "(none)";

  const hasApiKey = (() => {
    if (!config) return false;
    const llm = config.llm;
    switch (llm.provider) {
      case "foundry": return !!llm.apiKey;
      case "bedrock": return !!(llm.accessKeyId && llm.secretAccessKey);
      case "openai":
      case "deepseek":
      case "litellm": return !!llm.openaiApiKey;
      case "anthropic": return !!llm.anthropicApiKey;
      case "custom": return !!llm.customToken;
      default: return false;
    }
  })();

  const modelName = (() => {
    if (!config) return "unknown";
    const llm = config.llm;
    switch (llm.provider) {
      case "foundry": return llm.model || "(none)";
      case "bedrock": return llm.modelId || "(none)";
      case "openai":
      case "deepseek":
      case "litellm": return llm.openaiModel || "(none)";
      case "anthropic": return llm.anthropicModel || "(none)";
      case "custom": return llm.customModel || "(none)";
      default: return "unknown";
    }
  })();

  return (
    <>
      {/* Master Override Toggle */}
      <div className={card.card}>
        <div className={card.body}>
          <label className={styles.masterToggle}>
            <input
              type="checkbox"
              checked={overrides.enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <div>
              <div className={styles.masterLabel}>Override States</div>
              <div className={styles.masterDesc}>
                Enable dev overrides to simulate different app states without changing real config
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Permissions */}
      <div className={card.card}>
        <div className={card.header}>
          <h2>Permissions</h2>
        </div>
        <div className={card.body}>
          <StateRow label="Microphone">
            {statusDot(permStatus?.microphone)}
          </StateRow>
          <StateRow label="Accessibility">
            {boolDot(permStatus?.accessibility === true)}
          </StateRow>
        </div>
      </div>

      {/* Whisper / Speech */}
      <div className={card.card}>
        <div className={card.header}>
          <h2>Whisper / Speech</h2>
        </div>
        <div className={card.body}>
          <StateRow label="Selected Model">
            {selectedModel}
          </StateRow>
          <StateRow label="Downloaded Models">
            {downloadedModels.length > 0 ? downloadedModels.join(", ") : "(none)"}
          </StateRow>
        </div>
      </div>

      {/* LLM Configuration */}
      <div className={card.card}>
        <div className={card.header}>
          <h2>LLM Configuration</h2>
        </div>
        <div className={card.body}>
          <StateRow label="Provider">{llmProvider}</StateRow>
          <StateRow label="Enhancement Enabled">{boolDot(llmEnhancement)}</StateRow>
          <StateRow label="Connection Tested">{boolDot(llmConnectionTested)}</StateRow>
          <StateRow label="Config Hash">
            {hashMatch
              ? <><Dot color="green" />{llmConfigHash}</>
              : <><Dot color="yellow" />{llmConfigHash} (stale)</>
            }
          </StateRow>
          <StateRow label="Custom Prompt">{customPrompt}</StateRow>
          <StateRow label="API Key Present">{boolDot(hasApiKey)}</StateRow>
          <StateRow label="Model Name">{modelName}</StateRow>
        </div>
      </div>

      {/* Shortcuts */}
      <div className={card.card}>
        <div className={card.header}>
          <h2>Shortcuts</h2>
        </div>
        <div className={card.body}>
          <StateRow label="Hold">{config?.shortcuts?.hold || "(none)"}</StateRow>
          <StateRow label="Toggle">{config?.shortcuts?.toggle || "(none)"}</StateRow>
        </div>
      </div>

      {/* General Settings */}
      <div className={card.card}>
        <div className={card.header}>
          <h2>General Settings</h2>
        </div>
        <div className={card.body}>
          <StateRow label="Theme">{config?.theme || "system"}</StateRow>
          <StateRow label="Language">{config?.language || "system"}</StateRow>
          <StateRow label="Launch at Login">{boolDot(config?.launchAtLogin)}</StateRow>
          <StateRow label="Audio Cues">
            start: {config?.recordingAudioCue || "none"} / stop: {config?.recordingStopAudioCue || "none"} / error: {config?.errorAudioCue || "none"}
          </StateRow>
          <StateRow label="Dictionary Count">{config?.dictionary?.length ?? 0}</StateRow>
        </div>
      </div>

      {/* Recording / Pipeline */}
      <div className={card.card}>
        <div className={card.header}>
          <div className={styles.headerRow}>
            <h2>Recording / Pipeline</h2>
            <button className={styles.refreshBtn} onClick={fetchRuntime}>
              Refresh
            </button>
          </div>
        </div>
        <div className={card.body}>
          <StateRow label="Recording Active">
            {runtime ? boolDot(runtime.isRecording) : <Dot color="gray" />}
          </StateRow>
          <StateRow label="Shortcut State">
            {runtime ? statusDot(runtime.shortcutState) : <Dot color="gray" />}
          </StateRow>
        </div>
      </div>

      {/* Indicator Window */}
      <div className={card.card}>
        <div className={card.header}>
          <h2>Indicator Window</h2>
        </div>
        <div className={card.body}>
          <StateRow label="Visible">
            {runtime ? boolDot(runtime.indicatorVisible) : <Dot color="gray" />}
          </StateRow>
          <StateRow label="Mode">
            {runtime ? statusDot(runtime.indicatorMode) : <Dot color="gray" />}
          </StateRow>
        </div>
      </div>

      {/* Tray */}
      <div className={card.card}>
        <div className={card.header}>
          <h2>Tray</h2>
        </div>
        <div className={card.body}>
          <StateRow label="Active">
            {runtime ? boolDot(runtime.trayActive) : <Dot color="gray" />}
          </StateRow>
          <StateRow label="Listening">
            {runtime ? boolDot(runtime.isListening) : <Dot color="gray" />}
          </StateRow>
          <StateRow label="Has Model">
            {runtime ? boolDot(runtime.hasModel) : <Dot color="gray" />}
          </StateRow>
        </div>
      </div>

      {/* Update State */}
      <div className={card.card}>
        <div className={card.header}>
          <h2>Update State</h2>
        </div>
        <div className={card.body}>
          <StateRow label="Status">
            {statusDot(updateState?.status)}
          </StateRow>
          <StateRow label="Current Version">
            {version || "(unknown)"}
          </StateRow>
          <StateRow label="Latest Version">
            {updateState?.latestVersion || "(unknown)"}
          </StateRow>
          <StateRow label="Download Progress">
            {updateState?.status === "downloading"
              ? `${Math.round(updateState.downloadProgress)}%`
              : "N/A"
            }
          </StateRow>
        </div>
      </div>

      {/* History / Transcriptions */}
      <div className={card.card}>
        <div className={card.header}>
          <h2>History / Transcriptions</h2>
        </div>
        <div className={card.body}>
          <StateRow label="Total">{transcriptionTotal}</StateRow>
          <StateRow label="Page">{transcriptionPage}</StateRow>
          <StateRow label="Page Size">{transcriptionPageSize}</StateRow>
          <StateRow label="Search Query">{transcriptionSearch || "(none)"}</StateRow>
        </div>
      </div>

      {/* Window / UI State */}
      <div className={card.card}>
        <div className={card.header}>
          <h2>Window / UI State</h2>
        </div>
        <div className={card.body}>
          <StateRow label="Active Tab">{activeTab}</StateRow>
          <StateRow label="Sidebar Collapsed">{boolDot(collapsed)}</StateRow>
          <StateRow label="Setup Complete">{boolDot(setupComplete)}</StateRow>
          <StateRow label="Dev Mode">{boolDot(import.meta.env.DEV)}</StateRow>
          <StateRow label="Online">{boolDot(online)}</StateRow>
        </div>
      </div>

      {/* I18n State */}
      <div className={card.card}>
        <div className={card.header}>
          <h2>I18n State</h2>
        </div>
        <div className={card.body}>
          <StateRow label="System Locale">{systemLocale || "(loading)"}</StateRow>
          <StateRow label="Configured Language">{config?.language || "system"}</StateRow>
          <StateRow label="Supported Languages">{SUPPORTED_LANGUAGES.join(", ")}</StateRow>
        </div>
      </div>
    </>
  );
}
