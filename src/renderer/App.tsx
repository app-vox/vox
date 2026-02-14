import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import { useConfigStore } from "./stores/config-store";
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
import { SaveToast } from "./components/ui/SaveToast";
import { ScrollButtons } from "./components/ui/ScrollButtons";
import { useSaveToast } from "./hooks/use-save-toast";
import { useTheme } from "./hooks/use-theme";
import { I18nProvider } from "./i18n-context";

const PANELS: Record<string, () => JSX.Element | null> = {
  general: GeneralPanel,
  whisper: WhisperPanel,
  llm: LlmPanel,
  dictionary: DictionaryPanel,
  permissions: PermissionsPanel,
  shortcuts: ShortcutsPanel,
  transcriptions: TranscriptionsPanel,
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useTheme(theme);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    window.voxApi.navigation.onNavigateTab((tab) => {
      useConfigStore.getState().setActiveTab(tab);
    });
  }, []);

  useEffect(() => {
    const handleBlur = () => {
      if (showToast) hideToast();
    };
    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  }, [showToast, hideToast]);

  const handleCollapseChange = useCallback((collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-text-secondary text-sm" style={{ gap: "8px" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      </div>
    );
  }

  const Panel = PANELS[activeTab] ?? WhisperPanel;

  return (
    <I18nProvider>
      <div className="flex h-full">
        <Sidebar onCollapseChange={handleCollapseChange} />
        <div className="flex flex-col flex-1 min-w-0">
          <Titlebar />
          <main className="content" ref={contentRef}>
            <Panel />
          </main>
          <SaveToast show={showToast} timestamp={toastTimestamp} onHide={hideToast} sidebarCollapsed={sidebarCollapsed} />
          <ScrollButtons containerRef={contentRef} />
        </div>
      </div>
    </I18nProvider>
  );
}
