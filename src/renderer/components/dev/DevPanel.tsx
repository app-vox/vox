/* eslint-disable i18next/no-literal-string */
import { useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from "react";
import type { UpdateState, ModelInfo } from "../../../preload/index";
import { useConfigStore } from "../../stores/config-store";
import { useDevOverrides, type DevOverrides } from "../../stores/dev-overrides-store";
import { usePermissionsStore } from "../../stores/permissions-store";
import { useTranscriptionsStore } from "../../stores/transcriptions-store";
import { useOnlineStatus } from "../../hooks/use-online-status";
import { computeLlmConfigHash } from "../../../shared/llm-config-hash";
import { SUPPORTED_LANGUAGES } from "../../../shared/i18n";
import { SearchIcon } from "../../../shared/icons";
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

/* ── Helpers ─────────────────────────────────────────────────────── */

function Dot({ color }: { color: "green" | "yellow" | "red" | "gray" }) {
  return <span className={`${styles.dot} ${styles[color]}`} />;
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className={styles.highlight}>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function StateRow({ label, children, query, overridden }: { label: string; children: ReactNode; query?: string; overridden?: boolean }) {
  return (
    <div className={`${styles.stateRow} ${overridden ? styles.stateRowOverridden : ""}`}>
      <span className={styles.stateLabel}><Highlight text={label} query={query ?? ""} /></span>
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
    <select
      className={`${styles.overrideSelect} ${isActive ? styles.overrideActive : ""}`}
      value={isActive ? String(current) : "__real__"}
      onChange={(e) => {
        if (e.target.value === "__real__") clearOverride(field);
        else setOverride(field, e.target.value as DevOverrides[K]);
      }}
    >
      <option value="__real__">Real</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
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
    <select
      className={`${styles.overrideSelect} ${isActive ? styles.overrideActive : ""}`}
      value={isActive ? String(current) : "__real__"}
      onChange={(e) => {
        if (e.target.value === "__real__") clearOverride(field);
        else setOverride(field, (e.target.value === "true") as DevOverrides[K]);
      }}
    >
      <option value="__real__">Real</option>
      <option value="true">true</option>
      <option value="false">false</option>
    </select>
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
  return isActive ? (
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
  );
}

/* ── Card definition ─────────────────────────────────────────────── */

interface CardDef {
  title: string;
  rows: { label: string; render: (q: string) => ReactNode; overrideField?: keyof DevOverrides }[];
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
  const transcriptionSearch = useTranscriptionsStore((s) => s.searchQuery);

  const online = useOnlineStatus();

  const [runtime, setRuntime] = useState<RuntimeState | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [updateState, setUpdateState] = useState<UpdateState | null>(null);
  const [version, setVersion] = useState("");
  const [systemLocale, setSystemLocale] = useState("");
  const [search, setSearch] = useState("");

  const fetchRuntime = useCallback(async () => {
    try {
      const state = await window.voxApi.dev.getRuntimeState();
      setRuntime(state);
    } catch { /* dev IPC may not be available */ }
  }, []);

  const fetchModels = useCallback(async () => {
    try {
      const list = await window.voxApi.models.list();
      setModels(list);
    } catch { /* ignore */ }
  }, []);

  const didMount = useRef(false);
  useEffect(() => {
    if (didMount.current) return;
    didMount.current = true;
    void fetchRuntime();
    void fetchModels();
    void window.voxApi.updates.getState().then(setUpdateState);
    void window.voxApi.updates.getVersion().then(setVersion);
    void window.voxApi.i18n.getSystemLocale().then(setSystemLocale);
    if (!permStatus) void refreshPerms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return window.voxApi.updates.onStateChanged(setUpdateState);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => void fetchRuntime(), 1000);
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

  const collapsed = typeof window !== "undefined"
    ? localStorage.getItem("vox:sidebar-collapsed") === "true"
    : false;

  // Build card definitions
  const cards: CardDef[] = useMemo(() => [
    {
      title: "Update State",
      rows: [
        {
          label: "Status",
          overrideField: "updateStatus",
          render: () => (
            <>
              <span className={styles.realValue}>{statusDot(updateState?.status)}</span>
              {ov && <OverrideSelect field="updateStatus" options={[
                { value: "idle", label: "idle" }, { value: "checking", label: "checking" },
                { value: "available", label: "available" }, { value: "downloading", label: "downloading" },
                { value: "ready", label: "ready" }, { value: "error", label: "error" },
              ]} {...ovProps} />}
            </>
          ),
        },
        ...(ov ? [{
          label: "Download %",
          overrideField: "updateDownloadProgress" as keyof DevOverrides,
          render: () => <OverrideRange field="updateDownloadProgress" min={0} max={100} {...ovProps} />,
        }] : []),
        { label: "Version", render: () => <>{version || "(unknown)"}</> },
      ],
    },
    {
      title: "Permissions",
      rows: [
        {
          label: "Microphone",
          overrideField: "microphonePermission",
          render: () => (
            <>
              <span className={styles.realValue}>{statusDot(permStatus?.microphone)}</span>
              {ov && <OverrideSelect field="microphonePermission" options={[
                { value: "granted", label: "granted" }, { value: "denied", label: "denied" },
                { value: "not-determined", label: "not-determined" },
              ]} {...ovProps} />}
            </>
          ),
        },
        {
          label: "Accessibility",
          overrideField: "accessibilityPermission",
          render: () => (
            <>
              <span className={styles.realValue}>{boolDot(permStatus?.accessibility === true)}</span>
              {ov && <OverrideBool field="accessibilityPermission" {...ovProps} />}
            </>
          ),
        },
      ],
    },
    {
      title: "Setup & Connectivity",
      rows: [
        {
          label: "Setup Complete",
          overrideField: "setupComplete",
          render: () => (
            <>
              <span className={styles.realValue}>{boolDot(setupComplete)}</span>
              {ov && <OverrideBool field="setupComplete" {...ovProps} />}
            </>
          ),
        },
        {
          label: "Online",
          overrideField: "online",
          render: () => (
            <>
              <span className={styles.realValue}>{boolDot(online)}</span>
              {ov && <OverrideBool field="online" {...ovProps} />}
            </>
          ),
        },
      ],
    },
    {
      title: "Recording / Pipeline",
      rows: [
        {
          label: "Recording",
          overrideField: "isRecording",
          render: () => (
            <>
              <span className={styles.realValue}>{runtime ? boolDot(runtime.isRecording) : <Dot color="gray" />}</span>
              {ov && <OverrideBool field="isRecording" {...ovProps} />}
            </>
          ),
        },
        {
          label: "Shortcut State",
          overrideField: "shortcutState",
          render: () => (
            <>
              <span className={styles.realValue}>{runtime ? statusDot(runtime.shortcutState) : <Dot color="gray" />}</span>
              {ov && <OverrideSelect field="shortcutState" options={[
                { value: "idle", label: "idle" }, { value: "hold", label: "hold" },
                { value: "toggle", label: "toggle" }, { value: "processing", label: "processing" },
              ]} {...ovProps} />}
            </>
          ),
        },
      ],
    },
    {
      title: "Indicator",
      rows: [
        {
          label: "Visible",
          overrideField: "indicatorVisible",
          render: () => (
            <>
              <span className={styles.realValue}>{runtime ? boolDot(runtime.indicatorVisible) : <Dot color="gray" />}</span>
              {ov && <OverrideBool field="indicatorVisible" {...ovProps} />}
            </>
          ),
        },
        {
          label: "Mode",
          overrideField: "indicatorMode",
          render: () => (
            <>
              <span className={styles.realValue}>{runtime ? statusDot(runtime.indicatorMode) : <Dot color="gray" />}</span>
              {ov && <OverrideSelect field="indicatorMode" options={[
                { value: "initializing", label: "initializing" }, { value: "listening", label: "listening" },
                { value: "transcribing", label: "transcribing" }, { value: "enhancing", label: "enhancing" },
                { value: "error", label: "error" }, { value: "canceled", label: "canceled" },
              ]} {...ovProps} />}
            </>
          ),
        },
      ],
    },
    {
      title: "Tray",
      rows: [
        { label: "Active", render: () => <>{runtime ? boolDot(runtime.trayActive) : <Dot color="gray" />}</> },
        {
          label: "Listening",
          overrideField: "trayIsListening",
          render: () => (
            <>
              <span className={styles.realValue}>{runtime ? boolDot(runtime.isListening) : <Dot color="gray" />}</span>
              {ov && <OverrideBool field="trayIsListening" {...ovProps} />}
            </>
          ),
        },
        {
          label: "Has Model",
          overrideField: "trayHasModel",
          render: () => (
            <>
              <span className={styles.realValue}>{runtime ? boolDot(runtime.hasModel) : <Dot color="gray" />}</span>
              {ov && <OverrideBool field="trayHasModel" {...ovProps} />}
            </>
          ),
        },
      ],
    },
    {
      title: "LLM",
      rows: [
        { label: "Provider", render: () => <>{llmProvider}</> },
        {
          label: "Enhancement",
          overrideField: "llmEnhancementEnabled",
          render: () => (
            <>
              <span className={styles.realValue}>{boolDot(llmEnhancement)}</span>
              {ov && <OverrideBool field="llmEnhancementEnabled" {...ovProps} />}
            </>
          ),
        },
        {
          label: "Tested",
          overrideField: "llmConnectionTested",
          render: () => (
            <>
              <span className={styles.realValue}>{boolDot(llmConnectionTested)}</span>
              {ov && <OverrideBool field="llmConnectionTested" {...ovProps} />}
            </>
          ),
        },
        {
          label: "Hash",
          render: () => hashMatch
            ? <><Dot color="green" />ok</>
            : <><Dot color="yellow" />stale</>,
        },
        { label: "API Key", render: () => <>{boolDot(hasApiKey)}</> },
        { label: "Model", render: () => <>{modelName}</> },
      ],
    },
    {
      title: "Whisper",
      rows: [
        { label: "Model", render: () => <>{selectedModel}</> },
        { label: "Downloaded", render: () => <>{downloadedModels.length > 0 ? downloadedModels.join(", ") : "(none)"}</> },
      ],
    },
    {
      title: "General",
      rows: [
        { label: "Theme", render: () => <>{config?.theme || "system"}</> },
        { label: "Language", render: () => <>{config?.language || "system"}</> },
        { label: "Launch at Login", render: () => <>{boolDot(config?.launchAtLogin)}</> },
        { label: "Dictionary", render: () => <>{config?.dictionary?.length ?? 0} words</> },
      ],
    },
    {
      title: "Audio Cues",
      rows: [
        { label: "Start", render: () => <>{config?.recordingAudioCue || "none"}</> },
        { label: "Stop", render: () => <>{config?.recordingStopAudioCue || "none"}</> },
        { label: "Error", render: () => <>{config?.errorAudioCue || "none"}</> },
      ],
    },
    {
      title: "Shortcuts",
      rows: [
        { label: "Hold", render: () => <>{config?.shortcuts?.hold || "(none)"}</> },
        { label: "Toggle", render: () => <>{config?.shortcuts?.toggle || "(none)"}</> },
      ],
    },
    {
      title: "Transcriptions",
      rows: [
        { label: "Total", render: () => <>{transcriptionTotal}</> },
        { label: "Search", render: () => <>{transcriptionSearch || "(none)"}</> },
      ],
    },
    {
      title: "Window / UI",
      rows: [
        { label: "Active Tab", render: () => <>{activeTab}</> },
        { label: "Collapsed", render: () => <>{boolDot(collapsed)}</> },
        { label: "Dev Mode", render: () => <>{boolDot(import.meta.env.DEV)}</> },
        { label: "Online", render: () => <>{boolDot(online)}</> },
      ],
    },
    {
      title: "I18n",
      rows: [
        { label: "Locale", render: () => <>{systemLocale || "(loading)"}</> },
        { label: "Language", render: () => <>{config?.language || "system"}</> },
        { label: "Supported", render: () => <>{SUPPORTED_LANGUAGES.join(", ")}</> },
      ],
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [config, setupComplete, permStatus, online, runtime, updateState, version,
      models, systemLocale, ov, overrides, transcriptionTotal, transcriptionSearch,
      activeTab, collapsed, llmProvider, llmEnhancement, llmConnectionTested,
      llmConfigHash, currentHash, hashMatch, hasApiKey, modelName, selectedModel,
      downloadedModels]);

  const q = search.trim().toLowerCase();

  const gridRef = useRef<HTMLDivElement>(null);

  // Scroll to first match when search changes
  useEffect(() => {
    if (!q || !gridRef.current) return;
    const firstHighlight = gridRef.current.querySelector(`.${styles.highlight}`);
    if (firstHighlight) {
      firstHighlight.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [q]);

  const isRowOverridden = (field?: keyof DevOverrides) =>
    ov && field !== undefined && overrides[field] !== undefined;

  return (
    <>
      {/* Header: Override toggle + Search side by side */}
      <div className={styles.panelHeader}>
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
                  Simulate different app states. Overrides persist across reloads.
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
        <div className={styles.searchWrap}>
          <SearchIcon width={14} height={14} />
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search states..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.searchClear} onClick={() => setSearch("")}>x</button>
          )}
        </div>
      </div>

      {/* Grid — always shows all cards, search highlights + scrolls */}
      <div className={styles.grid} ref={gridRef}>
        {cards.map((c) => (
          <div key={c.title} className={card.card}>
            <div className={card.header}>
              <h2><Highlight text={c.title} query={q} /></h2>
            </div>
            <div className={card.body}>
              {c.rows.map((r) => (
                <StateRow key={r.label} label={r.label} query={q} overridden={isRowOverridden(r.overrideField)}>
                  {r.render(q)}
                </StateRow>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
