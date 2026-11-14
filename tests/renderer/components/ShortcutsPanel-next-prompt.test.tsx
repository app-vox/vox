// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { useConfigStore } from "../../../src/renderer/stores/config-store";
import { createDefaultConfig, type VoxConfig } from "../../../src/shared/config";
import { t } from "../../../src/shared/i18n";
import { installVoxApiMock, resetStores, renderWithI18n } from "../helpers/setup";
import type { VoxAPI } from "../../../src/preload/index";
import { ShortcutsPanel } from "../../../src/renderer/components/shortcuts/ShortcutsPanel";

// electron-log's renderer transport waits on Electron's IPC, which does not exist in jsdom.
vi.mock("../../../src/renderer/logger", () => ({
  default: { scope: () => ({ debug: () => {}, info: () => {}, warn: () => {}, error: () => {} }) },
}));

vi.mock("../../../src/renderer/components/shared/card.module.scss", () => ({
  default: new Proxy({}, { get: (_, prop) => `mock-card-${String(prop)}` }),
}));
vi.mock("../../../src/renderer/components/shared/forms.module.scss", () => ({
  default: new Proxy({}, { get: (_, prop) => `mock-form-${String(prop)}` }),
}));
vi.mock("../../../src/renderer/components/shared/buttons.module.scss", () => ({
  default: new Proxy({}, { get: (_, prop) => `mock-btn-${String(prop)}` }),
}));
vi.mock("../../../src/renderer/components/shortcuts/ShortcutsPanel.module.scss", () => ({
  default: new Proxy({}, { get: (_, prop) => `mock-panel-${String(prop)}` }),
}));
vi.mock("../../../src/renderer/components/shortcuts/ShortcutRecorder.module.scss", () => ({
  default: new Proxy({}, { get: (_, prop) => `mock-recorder-${String(prop)}` }),
}));

let api: VoxAPI;

function renderPanel(shortcuts: VoxConfig["shortcuts"]): void {
  const config = createDefaultConfig();
  config.shortcuts = shortcuts;
  useConfigStore.setState({ config, loading: false });
  renderWithI18n(<ShortcutsPanel />);
}

/** The Next prompt row: its label, recorder field, Clear button and hint. */
function nextPromptRow(): HTMLElement {
  return screen.getByText(t("shortcuts.nextPrompt")).parentElement!;
}

function startRecordingNextPrompt(): HTMLElement {
  const field = within(nextPromptRow()).getByText(t("shortcuts.notSet")).parentElement!;
  fireEvent.click(field);
  return field;
}

/** Clicks the recorder field in the row labelled `label` and returns that field. */
function startRecording(label: string): HTMLElement {
  const field = screen.getByText(label).parentElement!.querySelector<HTMLElement>("[tabindex]")!;
  fireEvent.click(field);
  return field;
}

beforeEach(() => {
  api = installVoxApiMock();
  // The shared mock leaves out the recorder's key capture calls.
  Object.assign(api.shortcuts, { startRecording: vi.fn(), stopRecording: vi.fn(), onKey: vi.fn(() => () => {}) });
  resetStores();
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe("Next prompt shortcut", () => {
  it("Clear unsets a set shortcut and keeps the recording shortcuts", async () => {
    renderPanel({ mode: "both", hold: "Ctrl+Space", toggle: "Ctrl+Shift+Space", nextPrompt: "Alt+Shift+P" });

    fireEvent.click(within(nextPromptRow()).getByRole("button", { name: t("shortcuts.clear") }));

    await waitFor(() => expect(api.config.save).toHaveBeenCalledOnce());
    expect(vi.mocked(api.config.save).mock.calls[0][0].shortcuts).toEqual({
      mode: "both", hold: "Ctrl+Space", toggle: "Ctrl+Shift+Space", nextPrompt: "",
    });
    expect(within(nextPromptRow()).getByText(t("shortcuts.notSet"))).toBeInTheDocument();
    expect(within(nextPromptRow()).queryByRole("button", { name: t("shortcuts.clear") })).toBeNull();
  });

  it("Clear is hidden while no shortcut is set", () => {
    renderPanel({ mode: "toggle", hold: "Alt+Space", toggle: "Alt+Shift+Space", nextPrompt: "" });

    expect(within(nextPromptRow()).queryByRole("button", { name: t("shortcuts.clear") })).toBeNull();
  });

  it("recorder ignores a modifier double-tap and does not offer one", () => {
    renderPanel({ mode: "toggle", hold: "Alt+Space", toggle: "Alt+Shift+Space", nextPrompt: "" });
    const field = startRecordingNextPrompt();

    expect(within(field).getByText(t("shortcuts.pressShortcut"))).toBeInTheDocument();
    fireEvent.keyDown(document, { code: "AltLeft", key: "Alt", altKey: true });
    fireEvent.keyDown(document, { code: "AltLeft", key: "Alt", altKey: true });

    expect(api.config.save).not.toHaveBeenCalled();
    expect(useConfigStore.getState().config!.shortcuts.nextPrompt).toBe("");
  });

  it("recorder flags a clash with an active recording shortcut", () => {
    renderPanel({ mode: "both", hold: "Alt+Space", toggle: "Alt+Shift+Space", nextPrompt: "" });
    const field = startRecordingNextPrompt();

    fireEvent.keyDown(document, { code: "Space", key: " ", altKey: true });

    expect(field).toHaveClass("mock-recorder-conflict");
    expect(api.config.save).not.toHaveBeenCalled();
    expect(useConfigStore.getState().config!.shortcuts.nextPrompt).toBe("");
  });

  it("recorder accepts the inactive hold shortcut in toggle mode", async () => {
    renderPanel({ mode: "toggle", hold: "Alt+Space", toggle: "Alt+Shift+Space", nextPrompt: "" });
    startRecordingNextPrompt();

    fireEvent.keyDown(document, { code: "Space", key: " ", altKey: true });

    await waitFor(() => expect(api.config.save).toHaveBeenCalledOnce());
    expect(useConfigStore.getState().config!.shortcuts.nextPrompt).toBe("Alt+Space");
  });

  it.each([
    { mode: "hold" as const, label: "shortcuts.holdMode" as const, kept: "Alt+Space" },
    { mode: "toggle" as const, label: "shortcuts.toggleMode" as const, kept: "Alt+Shift+Space" },
  ])("$mode recorder flags a clash with the Next prompt shortcut", ({ mode, label, kept }) => {
    renderPanel({ mode, hold: "Alt+Space", toggle: "Alt+Shift+Space", nextPrompt: "Alt+Shift+P" });
    const field = startRecording(t(label));

    fireEvent.keyDown(document, { code: "KeyP", key: "P", altKey: true, shiftKey: true });

    expect(field).toHaveClass("mock-recorder-conflict");
    expect(api.config.save).not.toHaveBeenCalled();
    expect(useConfigStore.getState().config!.shortcuts[mode]).toBe(kept);
  });
});
