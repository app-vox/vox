import { useEffect, useRef, lazy, Suspense, type JSX } from "react";
import { useConfigStore } from "./stores/config-store";
import { SpinnerIcon } from "../shared/icons";

// Clear dev overrides on startup so the app always starts clean (before any component mounts)
if (import.meta.env.DEV) {
  localStorage.removeItem("vox:dev-overrides");
}
import { Sidebar } from "./components/layout/Sidebar";
import { Titlebar } from "./components/layout/Titlebar";
import { AboutPanel } from "./components/about/AboutPanel";
import { LlmPanel } from "./components/llm/LlmPanel";
import { WhisperPanel } from "./components/whisper/WhisperPanel";
import { ShortcutsPanel } from "./components/shortcuts/ShortcutsPanel";
import { PermissionsPanel } from "./components/permissions/PermissionsPanel";
import { GeneralPanel } from "./components/general/GeneralPanel";
import { TranscriptionsPanel } from "./components/transcriptions/TranscriptionsPanel";
import { DictionaryPanel } from "./components/dictionary/DictionaryPanel";
import { ScrollButtons } from "./components/ui/ScrollButtons";
import { useTheme } from "./hooks/use-theme";
import { usePerformance } from "./hooks/use-performance";
import { I18nProvider } from "./i18n-context";

// Lazy-load DevPanel so the entire module tree is excluded from production bundles.
// In production, import.meta.env.DEV is false and this code path is dead-code-eliminated.
const LazyDevPanel = import.meta.env.DEV
  ? lazy(() => import("./components/dev/DevPanel").then((m) => ({ default: m.DevPanel })))
  : null;

function DevPanelWrapper() {
  if (!LazyDevPanel) return null;
  return (
    <Suspense fallback={null}>
      <LazyDevPanel />
    </Suspense>
  );
}

const PANELS: Record<string, () => JSX.Element | null> = {
  general: GeneralPanel,
  whisper: WhisperPanel,
  llm: LlmPanel,
  dictionary: DictionaryPanel,
  permissions: PermissionsPanel,
  shortcuts: ShortcutsPanel,
  transcriptions: TranscriptionsPanel,
  about: AboutPanel,
  ...(import.meta.env.DEV ? { dev: DevPanelWrapper } : {}),
};

export function App() {
  const loading = useConfigStore((s) => s.loading);
  const activeTab = useConfigStore((s) => s.activeTab);
  const loadConfig = useConfigStore((s) => s.loadConfig);
  const theme = useConfigStore((s) => s.config?.theme);
  const contentRef = useRef<HTMLElement>(null);

  useTheme(theme);

  const reduceAnimations = useConfigStore((s) => s.config?.reduceAnimations);
  const reduceVisualEffects = useConfigStore((s) => s.config?.reduceVisualEffects);
  usePerformance(reduceAnimations, reduceVisualEffects);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    window.voxApi.navigation.onNavigateTab((tab) => {
      useConfigStore.getState().setActiveTab(tab);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-secondary text-sm" style={{ gap: "12px" }}>
        <SpinnerIcon width={32} height={32} style={{ animation: "spin 1s linear infinite" }} />
        {/* Renders before I18nProvider — hardcoded is intentional */}
        {/* eslint-disable-next-line i18next/no-literal-string */}
        <span>Loading…</span>
      </div>
    );
  }

  const Panel = PANELS[activeTab] ?? WhisperPanel;

  return (
    <I18nProvider>
      <div className="flex h-full">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <Titlebar />
          <main className="content" ref={contentRef}>
            <Panel />
          </main>
          <ScrollButtons containerRef={contentRef} />
        </div>
      </div>
    </I18nProvider>
  );
}
