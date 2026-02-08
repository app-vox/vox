import { useConfigStore } from "../../stores/config-store";
import { ShortcutRecorder } from "./ShortcutRecorder";

export function ShortcutsPanel() {
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const saveConfig = useConfigStore((s) => s.saveConfig);

  if (!config) return null;

  const setHold = (accelerator: string) => {
    updateConfig({ shortcuts: { ...config.shortcuts, hold: accelerator } });
    saveConfig();
  };

  const setToggle = (accelerator: string) => {
    updateConfig({ shortcuts: { ...config.shortcuts, toggle: accelerator } });
    saveConfig();
  };

  const restoreDefaults = () => {
    updateConfig({ shortcuts: { hold: "Alt+Space", toggle: "Alt+Shift+Space" } });
    saveConfig();
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2>Keyboard Shortcuts</h2>
        <p className="card-description">Configure the keyboard shortcuts for voice recording. Click a field and press your desired key combination.</p>
      </div>
      <div className="card-body">
        <ShortcutRecorder
          label="Hold mode"
          hint="Hold to record, release to stop."
          value={config.shortcuts.hold}
          otherValue={config.shortcuts.toggle}
          onChange={setHold}
        />
        <ShortcutRecorder
          label="Toggle mode"
          hint="Press once to start, press again to stop."
          value={config.shortcuts.toggle}
          otherValue={config.shortcuts.hold}
          onChange={setToggle}
        />
        <button
          onClick={restoreDefaults}
          className="btn btn-secondary btn-sm"
          style={{ marginTop: 8 }}
        >
          Restore Defaults
        </button>
      </div>
    </div>
  );
}
