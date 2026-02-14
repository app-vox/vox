import { useState, useEffect, useCallback, type ReactNode } from "react";
import type { UpdateState, ModelInfo } from "../../../preload/index";
import { useConfigStore } from "../../stores/config-store";
import { useDevOverrides, type DevOverrides } from "../../stores/dev-overrides-store";
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

/* ── Override Controls ───────────────────────────────────────────── */

function OverrideSelect<K extends keyof DevOverrides>({
  field,
  options,
  overrides,
  setOverride,
  clearOverride,
}: {
  field: K;
  options: { value: string; label: string }[];
  overrides: DevOverrides;
  setOverride: (key: K, value: DevOverrides[K]) => void;
  clearOverride: (key: keyof DevOverrides) => void;
}) {
  const current = overrides[field];
  const isActive = current !== undefined;
  return (
    <div className={styles.overrideControl}>
      <select
        className={`${styles.overrideSelect} ${isActive ? styles.overrideActive : ""}`}
        value={isActive ? String(current) : "__real__"}
        onChange={(e) => {
          if (e.target.value === "__real__") {
            clearOverride(field);
          } else {
            setOverride(field, e.target.value as DevOverrides[K]);
          }
        }}
      >
        <option value="__real__">Real</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function OverrideBool<K extends keyof DevOverrides>({
  field,
  overrides,
  setOverride,
  clearOverride,
}: {
  field: K;
  overrides: DevOverrides;
  setOverride: (key: K, value: DevOverrides[K]) => void;
  clearOverride: (key: keyof DevOverrides) => void;
}) {
  const current = overrides[field];
  const isActive = current !== undefined;
  return (
    <div className={styles.overrideControl}>
      <select
        className={`${styles.overrideSelect} ${isActive ? styles.overrideActive : ""}`}
        value={isActive ? String(current) : "__real__"}
        onChange={(e) => {
          if (e.target.value === "__real__") {
            clearOverride(field);
          } else {
            setOverride(field, (e.target.value === "true") as DevOverrides[K]);
          }
        }}
      >
        <option value="__real__">Real</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    </div>
  );
}

function OverrideRange<K extends keyof DevOverrides>({
  field,
  min,
  max,
  overrides,
  setOverride,
  clearOverride,
}: {
  field: K;
  min: number;
  max: number;
  overrides: DevOverrides;
  setOverride: (key: K, value: DevOverrides[K]) => void;
  clearOverride: (key: keyof DevOverrides) => void;
}) {
  const current = overrides[field];
  const isActive = current !== undefined;
  return (
    <div className={styles.overrideControl}>
      {isActive ? (
        <div className={styles.rangeRow}>
          <input
            type="range"
            min={min}
            max={max}
            value={Number(current)}
            className={styles.overrideRange}
            onChange={(e) => setOverride(field, Number(e.target.value) as DevOverrides[K])}
          />
          <span className={styles.rangeValue}>{String(current)}%</span>
          <button className={styles.clearBtn} onClick={() => clearOverride(field)}>x</button>
        </div>
      ) : (
        <button className={styles.setBtn} onClick={() => setOverride(field, 50 as DevOverrides[K])}>
          Set
        </button>
      )}
    </div>
  );
}

/* ── Main Panel ──────────────────────────────────────────────────── */

export function DevPanel() {
  const config = useConfigStore((s) => s.config);
  const activeTab = useConfigStore((s) => s.activeTab);
  const setupComplete = useConfigStore((s) => s.setupComplete);

  const overrides = useDevOverrides((s) => s.overrides);
  const setEnabled = useDevOverrides((s) => s.setEnabled);
  const setOverride = useDevOverrides((s) => s.setOverride);
  const clearOverride = useDevOverrides((s) => s.clearOverride);
  const clearAll = useDevOverrides((s) => s.clearAll);

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

  const ov = overrides.enabled;
  const ovProps = { overrides, setOverride, clearOverride };

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
                Enable dev overrides to simulate different app states. Choose "Real" to use actual values.
              </div>
            </div>
          </label>
          {ov && (
            <button className={styles.clearAllBtn} onClick={clearAll}>
              Clear All Overrides
            </button>
          )}
        </div>
      </div>

      {/* ── UX States (prioritized) ──────────────────────────────── */}

      {/* Update State */}
      <div className={card.card}>
        <div className={card.header}>
          <h2>Update State</h2>
        </div>
        <div className={card.body}>
          <StateRow label="Status">
            <span className={styles.realValue}>{statusDot(updateState?.status)}</span>
            {ov && (
              <OverrideSelect
                field="updateStatus"
                options={[
                  { value: "idle", label: "idle" },
                  { value: "checking", label: "checking" },
                  { value: "available", label: "available" },
                  { value: "downloading", label: "downloading" },
                  { value: "ready", label: "ready" },
                  { value: "error", label: "error" },
                ]}
                {...ovProps}
              />
            )}
          </StateRow>
          {ov && (
            <StateRow label="Download Progress">
              <OverrideRange field="updateDownloadProgress" min={0} max={100} {...ovProps} />
            </StateRow>
          )}
          <StateRow label="Current Version">{version || "(unknown)"}</StateRow>
          <StateRow label="Latest Version">{updateState?.latestVersion || "(unknown)"}</StateRow>
          {!ov && (
            <StateRow label="Download Progress">
              {updateState?.status === "downloading"
                ? `${Math.round(updateState.downloadProgress)}%`
                : "N/A"
              }
            </StateRow>
          )}
        </div>
      </div>

      {/* Permissions */}
      <div className={card.card}>
        <div className={card.header}>
          <h2>Permissions</h2>
        </div>
        <div className={card.body}>
          <StateRow label="Microphone">
            <span className={styles.realValue}>{statusDot(permStatus?.microphone)}</span>
            {ov && (
              <OverrideSelect
                field="microphonePermission"
                options={[
                  { value: "granted", label: "granted" },
                  { value: "denied", label: "denied" },
                  { value: "not-determined", label: "not-determined" },
                ]}
                {...ovProps}
              />
            )}
          </StateRow>
          <StateRow label="Accessibility">
            <span className={styles.realValue}>{boolDot(permStatus?.accessibility === true)}</span>
            {ov && <OverrideBool field="accessibilityPermission" {...ovProps} />}
          </StateRow>
        </div>
      </div>

      {/* Setup & Connectivity */}
      <div className={card.card}>
        <div className={card.header}>
          <h2>Setup &amp; Connectivity</h2>
        </div>
        <div className={card.body}>
          <StateRow label="Setup Complete">
            <span className={styles.realValue}>{boolDot(setupComplete)}</span>
            {ov && <OverrideBool field="setupComplete" {...ovProps} />}
          </StateRow>
          <StateRow label="Online">
            <span className={styles.realValue}>{boolDot(online)}</span>
            {ov && <OverrideBool field="online" {...ovProps} />}
          </StateRow>
        </div>
      </div>

      {/* ── Recording & Pipeline ─────────────────────────────────── */}

      <div className={card.card}>
        <div className={card.header}>
          <div className={styles.headerRow}>
            <h2>Recording / Pipeline</h2>
            <button className={styles.refreshBtn} onClick={fetchRuntime}>Refresh</button>
          </div>
        </div>
        <div className={card.body}>
          <StateRow label="Recording Active">
            <span className={styles.realValue}>{runtime ? boolDot(runtime.isRecording) : <Dot color="gray" />}</span>
            {ov && <OverrideBool field="isRecording" {...ovProps} />}
          </StateRow>
          <StateRow label="Shortcut State">
            <span className={styles.realValue}>{runtime ? statusDot(runtime.shortcutState) : <Dot color="gray" />}</span>
            {ov && (
              <OverrideSelect
                field="shortcutState"
                options={[
                  { value: "idle", label: "idle" },
                  { value: "hold", label: "hold" },
                  { value: "toggle", label: "toggle" },
                  { value: "processing", label: "processing" },
                ]}
                {...ovProps}
              />
            )}
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
            <span className={styles.realValue}>{runtime ? boolDot(runtime.indicatorVisible) : <Dot color="gray" />}</span>
            {ov && <OverrideBool field="indicatorVisible" {...ovProps} />}
          </StateRow>
          <StateRow label="Mode">
            <span className={styles.realValue}>{runtime ? statusDot(runtime.indicatorMode) : <Dot color="gray" />}</span>
            {ov && (
              <OverrideSelect
                field="indicatorMode"
                options={[
                  { value: "initializing", label: "initializing" },
                  { value: "listening", label: "listening" },
                  { value: "transcribing", label: "transcribing" },
                  { value: "enhancing", label: "enhancing" },
                  { value: "error", label: "error" },
                  { value: "canceled", label: "canceled" },
                ]}
                {...ovProps}
              />
            )}
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
            <span className={styles.realValue}>{runtime ? boolDot(runtime.isListening) : <Dot color="gray" />}</span>
            {ov && <OverrideBool field="trayIsListening" {...ovProps} />}
          </StateRow>
          <StateRow label="Has Model">
            <span className={styles.realValue}>{runtime ? boolDot(runtime.hasModel) : <Dot color="gray" />}</span>
            {ov && <OverrideBool field="trayHasModel" {...ovProps} />}
          </StateRow>
        </div>
      </div>

      {/* ── Config States (read-only) ────────────────────────────── */}

      {/* LLM Configuration */}
      <div className={card.card}>
        <div className={card.header}>
          <h2>LLM Configuration</h2>
        </div>
        <div className={card.body}>
          <StateRow label="Provider">{llmProvider}</StateRow>
          <StateRow label="Enhancement Enabled">
            <span className={styles.realValue}>{boolDot(llmEnhancement)}</span>
            {ov && <OverrideBool field="llmEnhancementEnabled" {...ovProps} />}
          </StateRow>
          <StateRow label="Connection Tested">
            <span className={styles.realValue}>{boolDot(llmConnectionTested)}</span>
            {ov && <OverrideBool field="llmConnectionTested" {...ovProps} />}
          </StateRow>
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

      {/* Whisper / Speech */}
      <div className={card.card}>
        <div className={card.header}>
          <h2>Whisper / Speech</h2>
        </div>
        <div className={card.body}>
          <StateRow label="Selected Model">{selectedModel}</StateRow>
          <StateRow label="Downloaded Models">
            {downloadedModels.length > 0 ? downloadedModels.join(", ") : "(none)"}
          </StateRow>
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
          <StateRow label="Dev Mode">{boolDot(import.meta.env.DEV)}</StateRow>
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
