import { useEffect, useRef, type JSX } from "react";
import { useConfigStore } from "./stores/config-store";
import { Sidebar } from "./components/layout/Sidebar";
import { AboutPanel } from "./components/about/AboutPanel";
import { LlmPanel } from "./components/llm/LlmPanel";
import { WhisperPanel } from "./components/whisper/WhisperPanel";
import { ShortcutsPanel } from "./components/shortcuts/ShortcutsPanel";
import { PermissionsPanel } from "./components/permissions/PermissionsPanel";
import { GeneralPanel } from "./components/general/GeneralPanel";
import { HistoryPanel } from "./components/history/HistoryPanel";
import { DictionaryPanel } from "./components/dictionary/DictionaryPanel";
import { SaveToast } from "./components/ui/SaveToast";
import { ScrollButtons } from "./components/ui/ScrollButtons";
import { useSaveToast } from "./hooks/use-save-toast";
import { useTheme } from "./hooks/use-theme";

const PANELS: Record<string, () => JSX.Element | null> = {
  general: GeneralPanel,
  whisper: WhisperPanel,
  llm: LlmPanel,
  dictionary: DictionaryPanel,
  permissions: PermissionsPanel,
  shortcuts: ShortcutsPanel,
  history: HistoryPanel,
  about: AboutPanel,
};

export function App() {
  const loading = useConfigStore((s) => s.loading);
  const activeTab = useConfigStore((s) => s.activeTab);
  const loadConfig = useConfigStore((s) => s.loadConfig);
  const theme = useConfigStore((s) => s.config?.theme);
  const showToast = useSaveToast((s) => s.show);
  const toastTimestamp = useSaveToast((s) => s.timestamp);
  const hideToast = useSaveToast((s) => s.hide);
  const contentRef = useRef<HTMLElement>(null);

  useTheme(theme);

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
      <div className="flex items-center justify-center h-full text-text-secondary text-sm">
        Loading...
      </div>
    );
  }

  const Panel = PANELS[activeTab] ?? WhisperPanel;

  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <main className="content" ref={contentRef}>
          <Panel />
        </main>
        <SaveToast show={showToast} timestamp={toastTimestamp} onHide={hideToast} />
        <ScrollButtons containerRef={contentRef} />
      </div>
    </div>
  );
}
