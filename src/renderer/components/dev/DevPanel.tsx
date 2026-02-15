/* eslint-disable i18next/no-literal-string */
import { useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from "react";
import type { UpdateState, ModelInfo } from "../../../preload/index";
import { useConfigStore } from "../../stores/config-store";
import { useDevOverrides, type DevOverrides } from "../../stores/dev-overrides-store";
import { usePermissionsStore } from "../../stores/permissions-store";
import { useTranscriptionsStore } from "../../stores/transcriptions-store";
import { useSaveToast } from "../../hooks/use-save-toast";
import { useOnlineStatus } from "../../hooks/use-online-status";
import { computeLlmConfigHash } from "../../../shared/llm-config-hash";
import { SUPPORTED_LANGUAGES } from "../../../shared/i18n";
import { RefreshIcon, InfoCircleIcon } from "../../../shared/icons";
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
    <div className={styles.stateRow}>
      <span className={styles.stateLabel}>
        {overridden && <span className={styles.overrideDot} />}
        <Highlight text={label} query={query ?? ""} />
      </span>
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
      <option value="__real__">Actual</option>
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
      <option value="__real__">Actual</option>
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
  overrideFields?: (keyof DevOverrides)[];
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
  const fetchTranscriptions = useTranscriptionsStore((s) => s.fetchPage);
  const triggerToast = useSaveToast((s) => s.trigger);

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
    void fetchTranscriptions();
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

  const isPresetActive = (preset: Partial<DevOverrides>) =>
    ov && Object.entries(preset).every(([key, value]) =>
      overrides[key as keyof DevOverrides] === value,
    );

  const applyPreset = (preset: Partial<DevOverrides>) => {
    if (isPresetActive(preset)) {
      for (const key of Object.keys(preset)) {
        clearOverride(key as keyof DevOverrides);
      }
      return;
    }
    if (!ov) setEnabled(true);
    for (const [key, value] of Object.entries(preset)) {
      setOverride(key as keyof DevOverrides, value as DevOverrides[keyof DevOverrides]);
    }
  };

  const presets: { label: string; preset: Partial<DevOverrides> }[] = [
    { label: "No Internet", preset: { online: false } },
    { label: "LLM Not Configured", preset: { llmEnhancementEnabled: false, llmConnectionTested: false } },
    { label: "LLM Untested", preset: { llmEnhancementEnabled: true, llmConnectionTested: false } },
    { label: "No Model", preset: { setupComplete: false } },
    { label: "Permissions Denied", preset: { microphonePermission: "denied", accessibilityPermission: false } },
    { label: "Update Available", preset: { updateStatus: "available" } },
    { label: "Update Downloading", preset: { updateStatus: "downloading", updateDownloadProgress: 42 } },
    { label: "Update Ready", preset: { updateStatus: "ready" } },
    { label: "Everything Broken", preset: { online: false, setupComplete: false, microphonePermission: "denied", accessibilityPermission: false, updateStatus: "error", llmEnhancementEnabled: false, llmConnectionTested: false } },
  ];

  const collapsed = typeof window !== "undefined"
    ? localStorage.getItem("vox:sidebar-collapsed") === "true"
    : false;

  // Build card definitions
  const cards: CardDef[] = useMemo(() => [
    {
      title: "Update State",
      overrideFields: ["updateStatus", "updateDownloadProgress"],
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
      overrideFields: ["microphonePermission", "accessibilityPermission"],
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
      overrideFields: ["setupComplete", "online"],
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
        { label: "Recording", render: () => <>{runtime ? boolDot(runtime.isRecording) : <Dot color="gray" />}</> },
        { label: "Shortcut State", render: () => <>{runtime ? statusDot(runtime.shortcutState) : <Dot color="gray" />}</> },
      ],
    },
    {
      title: "Indicator",
      rows: [
        { label: "Visible", render: () => <>{runtime ? boolDot(runtime.indicatorVisible) : <Dot color="gray" />}</> },
        { label: "Mode", render: () => <>{runtime ? statusDot(runtime.indicatorMode) : <Dot color="gray" />}</> },
      ],
    },
    {
      title: "Tray",
      rows: [
        { label: "Active", render: () => <>{runtime ? boolDot(runtime.trayActive) : <Dot color="gray" />}</> },
        { label: "Listening", render: () => <>{runtime ? boolDot(runtime.isListening) : <Dot color="gray" />}</> },
        { label: "Has Model", render: () => <>{runtime ? boolDot(runtime.hasModel) : <Dot color="gray" />}</> },
      ],
    },
    {
      title: "LLM",
      overrideFields: ["llmEnhancementEnabled", "llmConnectionTested"],
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
      overrideFields: ["hideDevVisuals"],
      rows: [
        { label: "Active Tab", render: () => <>{activeTab}</> },
        { label: "Collapsed", render: () => <>{boolDot(collapsed)}</> },
        {
          label: "Dev Visuals",
          overrideField: "hideDevVisuals",
          render: () => (
            <>
              <span className={styles.realValue}>{boolDot(true)} visible</span>
              {ov && <OverrideBool field="hideDevVisuals" {...ovProps} />}
            </>
          ),
        },
        { label: "Online", render: () => <>{boolDot(online)}</> },
        {
          label: "Save Toast",
          render: () => (
            <button className={styles.setBtn} onClick={triggerToast}>
              Trigger
            </button>
          ),
        },
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

  const hasCardOverrides = (fields?: (keyof DevOverrides)[]) =>
    ov && fields !== undefined && fields.some((f) => overrides[f] !== undefined);

  const clearCardOverrides = (fields?: (keyof DevOverrides)[]) => {
    if (!fields) return;
    for (const f of fields) clearOverride(f);
  };

  const hideDevVisuals = ov && overrides.hideDevVisuals === true;

  return (
    <>
      {/* Dev Visuals toggle — always visible, outside the blur wrapper */}
      {hideDevVisuals && (
        <div className={styles.devVisualsBanner}>
          <InfoCircleIcon width={13} height={13} />
          <span>
            Dev visuals hidden. If you navigate away from this tab, restart your environment
            (<code>npm run dev</code>) to access overrides again.
          </span>
          <button
            className={styles.setBtn}
            onClick={() => clearOverride("hideDevVisuals")}
          >
            Show
          </button>
        </div>
      )}

      <div className={hideDevVisuals ? styles.devBlurred : undefined}>
      {/* Header row: override toggle + search */}
      <div className={styles.panelHeader}>
        <label className={styles.masterToggle}>
          <input
            type="checkbox"
            checked={overrides.enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <span className={styles.masterLabel}>Override States</span>
        </label>
        <div className={styles.headerRight}>
          <div className={styles.searchWrap}>
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
          {ov && (
            <button className={styles.clearAllBtn} onClick={clearAll}>
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className={styles.disclaimer}>
        <InfoCircleIcon width={13} height={13} />
        <span>
          <strong>This panel is only visible in development mode.</strong>{" "}
          Some values may become outdated as configuration changes. Read-only states come from the main process and cannot be overridden.
        </span>
      </div>

      {/* Presets */}
      <div className={styles.presetsLabel}>Presets</div>
      <div className={styles.presets}>
        {presets.map((p) => (
          <button
            key={p.label}
            className={`${styles.presetBtn} ${isPresetActive(p.preset) ? styles.presetBtnActive : ""}`}
            onClick={() => applyPreset(p.preset)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Grid — always shows all cards, search highlights + scrolls */}
      <div className={styles.grid} ref={gridRef}>
        {cards.map((c) => (
          <div key={c.title} className={`${card.card} ${hasCardOverrides(c.overrideFields) ? styles.cardOverridden : ""}`}>
            <div className={`${card.header} ${styles.cardHeader}`}>
              <h2><Highlight text={c.title} query={q} /></h2>
              {hasCardOverrides(c.overrideFields) && (
                <button
                  className={styles.restoreBtn}
                  onClick={() => clearCardOverrides(c.overrideFields)}
                  title="Restore actual values"
                >
                  <RefreshIcon width={12} height={12} />
                </button>
              )}
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
      </div>
    </>
  );
}
