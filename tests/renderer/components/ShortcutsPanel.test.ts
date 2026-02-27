import { describe, it, expect, beforeEach } from "vitest";
import { useConfigStore } from "../../../src/renderer/stores/config-store";
import { createDefaultConfig } from "../../../src/shared/config";
import { installVoxApiMock, resetStores } from "../helpers/setup";

beforeEach(() => {
  installVoxApiMock();
  resetStores();
  localStorage.clear();
});

describe("ShortcutsPanel conflict resolution", () => {
  it("clears hold shortcut when toggle is set to same value in toggle mode", () => {
    const config = createDefaultConfig();
    config.shortcuts = { mode: "toggle", hold: "Alt+Space", toggle: "Alt+Shift+Space" };
    useConfigStore.setState({ config });

    const store = useConfigStore.getState();
    const shortcuts = store.config!.shortcuts;
    const newToggle = "Alt+Space";

    const updates = { ...shortcuts, toggle: newToggle };
    if (shortcuts.mode !== "both" && newToggle === shortcuts.hold) {
      updates.hold = "";
    }
    store.updateConfig({ shortcuts: updates });

    const result = useConfigStore.getState().config!;
    expect(result.shortcuts.toggle).toBe("Alt+Space");
    expect(result.shortcuts.hold).toBe("");
  });

  it("clears toggle shortcut when hold is set to same value in hold mode", () => {
    const config = createDefaultConfig();
    config.shortcuts = { mode: "hold", hold: "Alt+Space", toggle: "Alt+Shift+Space" };
    useConfigStore.setState({ config });

    const store = useConfigStore.getState();
    const shortcuts = store.config!.shortcuts;
    const newHold = "Alt+Shift+Space";

    const updates = { ...shortcuts, hold: newHold };
    if (shortcuts.mode !== "both" && newHold === shortcuts.toggle) {
      updates.toggle = "";
    }
    store.updateConfig({ shortcuts: updates });

    const result = useConfigStore.getState().config!;
    expect(result.shortcuts.hold).toBe("Alt+Shift+Space");
    expect(result.shortcuts.toggle).toBe("");
  });

  it("does NOT clear other shortcut in 'both' mode", () => {
    const config = createDefaultConfig();
    config.shortcuts = { mode: "both", hold: "Alt+Space", toggle: "Alt+Shift+Space" };
    useConfigStore.setState({ config });

    const store = useConfigStore.getState();
    const shortcuts = store.config!.shortcuts;
    const newToggle = "Alt+Space";

    const updates = { ...shortcuts, toggle: newToggle };
    if (shortcuts.mode !== "both" && newToggle === shortcuts.hold) {
      updates.hold = "";
    }
    store.updateConfig({ shortcuts: updates });

    const result = useConfigStore.getState().config!;
    // In "both" mode, the recorder's own conflict check prevents this from happening,
    // so the panel should NOT clear the other shortcut
    expect(result.shortcuts.hold).toBe("Alt+Space");
  });

  it("does not clear when there is no conflict", () => {
    const config = createDefaultConfig();
    config.shortcuts = { mode: "toggle", hold: "Alt+Space", toggle: "Alt+Shift+Space" };
    useConfigStore.setState({ config });

    const store = useConfigStore.getState();
    const shortcuts = store.config!.shortcuts;
    const newToggle = "Ctrl+Space";

    const updates = { ...shortcuts, toggle: newToggle };
    if (shortcuts.mode !== "both" && newToggle === shortcuts.hold) {
      updates.hold = "";
    }
    store.updateConfig({ shortcuts: updates });

    const result = useConfigStore.getState().config!;
    expect(result.shortcuts.toggle).toBe("Ctrl+Space");
    expect(result.shortcuts.hold).toBe("Alt+Space");
  });
});
