import { useEffect, type JSX } from "react";
import { useConfigStore } from "./stores/config-store";
import { Header } from "./components/layout/Header";
import { TabNav } from "./components/layout/TabNav";
import { LlmPanel } from "./components/llm/LlmPanel";
import { WhisperPanel } from "./components/whisper/WhisperPanel";
import { ShortcutsPanel } from "./components/shortcuts/ShortcutsPanel";
import { PermissionsPanel } from "./components/permissions/PermissionsPanel";

const PANELS: Record<string, () => JSX.Element | null> = {
  llm: LlmPanel,
  whisper: WhisperPanel,
  shortcuts: ShortcutsPanel,
  permissions: PermissionsPanel,
};

export function App() {
  const loading = useConfigStore((s) => s.loading);
  const activeTab = useConfigStore((s) => s.activeTab);
  const loadConfig = useConfigStore((s) => s.loadConfig);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-text-secondary text-sm">
        Loading...
      </div>
    );
  }

  const Panel = PANELS[activeTab] ?? LlmPanel;

  return (
    <div className="flex flex-col h-full">
      <Header />
      <TabNav />
      <main className="content">
        <Panel />
      </main>
    </div>
  );
}
