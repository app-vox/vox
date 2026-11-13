// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { screen, cleanup, waitFor, act, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { useConfigStore } from "../../../src/renderer/stores/config-store";
import { createDefaultConfig } from "../../../src/shared/config";
import { installVoxApiMock, resetStores, renderWithI18n } from "../helpers/setup";
import type { VoxAPI } from "../../../src/preload/index";
import { PROMPT_TEMPLATES } from "../../../src/shared/prompt-templates";
import { Tabs } from "../../../src/shared/tabs";

// Mock SCSS modules
vi.mock("../../../src/renderer/components/shared/card.module.scss", () => ({
  default: new Proxy({}, { get: (_, prop) => `mock-card-${String(prop)}` }),
}));
vi.mock("../../../src/renderer/components/shared/forms.module.scss", () => ({
  default: new Proxy({}, { get: (_, prop) => `mock-form-${String(prop)}` }),
}));
vi.mock("../../../src/renderer/components/shared/buttons.module.scss", () => ({
  default: new Proxy({}, { get: (_, prop) => `mock-btn-${String(prop)}` }),
}));
vi.mock("../../../src/renderer/components/llm/LlmPanel.module.scss", () => ({
  default: new Proxy({}, { get: (_, prop) => `mock-llm-${String(prop)}` }),
}));

// Mock icon components
vi.mock("../../../src/shared/icons", () => ({
  ExternalLinkIcon: (props: Record<string, unknown>) => <svg data-testid="external-link-icon" {...props} />,
  CheckCircleIcon: (props: Record<string, unknown>) => <svg data-testid="check-circle-icon" {...props} />,
  InfoCircleAltIcon: (props: Record<string, unknown>) => <svg data-testid="info-circle-icon" {...props} />,
  CopyIcon: (props: Record<string, unknown>) => <svg data-testid="copy-icon" {...props} />,
  SparkleIcon: (props: Record<string, unknown>) => <svg data-testid="sparkle-icon" {...props} />,
  PlayIcon: (props: Record<string, unknown>) => <svg data-testid="play-icon" {...props} />,
}));

// Mock sub-components to isolate LlmPanel behavior
vi.mock("../../../src/renderer/components/llm/FoundryFields", () => ({
  FoundryFields: () => <div data-testid="foundry-fields" />,
}));
vi.mock("../../../src/renderer/components/llm/BedrockFields", () => ({
  BedrockFields: () => <div data-testid="bedrock-fields" />,
}));
vi.mock("../../../src/renderer/components/llm/OpenAICompatibleFields", () => ({
  OpenAICompatibleFields: ({ providerType }: { providerType: string }) => (
    <div data-testid={`openai-fields-${providerType}`} />
  ),
}));
vi.mock("../../../src/renderer/components/llm/LiteLLMFields", () => ({
  LiteLLMFields: () => <div data-testid="litellm-fields" />,
}));
vi.mock("../../../src/renderer/components/llm/AnthropicFields", () => ({
  AnthropicFields: () => <div data-testid="anthropic-fields" />,
}));
vi.mock("../../../src/renderer/components/llm/CustomProviderFields", () => ({
  CustomProviderFields: () => <div data-testid="custom-provider-fields" />,
}));

// Mock CustomSelect as a simple <select> for easy interaction
vi.mock("../../../src/renderer/components/ui/CustomSelect", () => ({
  CustomSelect: ({
    id,
    value,
    items,
    onChange,
  }: {
    id?: string;
    value: string;
    items: Array<{ value?: string; label: string; divider?: boolean }>;
    onChange: (value: string) => void;
  }) => (
    <select
      data-testid={id ?? "custom-select"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {items
        .filter((item) => !item.divider && item.value)
        .map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
    </select>
  ),
}));

// Mock StatusBox to show text content
vi.mock("../../../src/renderer/components/ui/StatusBox", () => ({
  StatusBox: ({ text, type }: { text: string; type: string }) =>
    text ? <div data-testid="status-box" data-type={type}>{text}</div> : null,
}));

// Mock NewDot as empty span
vi.mock("../../../src/renderer/components/ui/NewDot", () => ({
  NewDot: () => <span data-testid="new-dot" />,
}));

// Mock use-dev-override hook: return the real value passed
vi.mock("../../../src/renderer/hooks/use-dev-override", () => ({
  useDevOverrideValue: (_key: string, realValue: unknown) => realValue,
  useDevOverridesActive: () => false,
}));

let voxApi: VoxAPI;

beforeEach(() => {
  vi.restoreAllMocks();
  resetStores();
  useConfigStore.setState({ llmSubTab: "provider" });
  voxApi = installVoxApiMock();
  voxApi.prompts = { setActive: vi.fn().mockResolvedValue(undefined) };
  // jsdom does not implement scrollIntoView
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
});

// Lazy import so mocks are registered before module loads
async function loadLlmPanel() {
  const mod = await import("../../../src/renderer/components/llm/LlmPanel");
  return mod.LlmPanel;
}

describe("LlmPanel", () => {
  it("returns null when config is not loaded", async () => {
    const LlmPanel = await loadLlmPanel();

    useConfigStore.setState({ config: null, setupComplete: true });

    const { container } = renderWithI18n(<LlmPanel />);
    expect(container.innerHTML).toBe("");
  });

  it("renders setup-required message when setupComplete is false", async () => {
    const LlmPanel = await loadLlmPanel();
    const config = createDefaultConfig();

    useConfigStore.setState({ config, setupComplete: false });

    renderWithI18n(<LlmPanel />);

    // Should not show provider fields
    expect(screen.queryByTestId("foundry-fields")).not.toBeInTheDocument();
    expect(screen.queryByTestId("llm-provider")).not.toBeInTheDocument();

    // Should show the setup-required warning banner area (card with header)
    // The component renders a warningBanner div when setupComplete is false
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("shows placeholder when enhancement is enabled but provider not configured", async () => {
    const LlmPanel = await loadLlmPanel();
    const config = createDefaultConfig();
    config.enableLlmEnhancement = true;

    useConfigStore.setState({ config, setupComplete: true });

    renderWithI18n(<LlmPanel />);

    // Provider select should be visible
    expect(screen.getByTestId("llm-provider")).toBeInTheDocument();
    // But no provider fields since no provider has been configured/tested
    expect(screen.queryByTestId("foundry-fields")).not.toBeInTheDocument();
    // Test connection button should be disabled
    const buttons = screen.getAllByRole("button");
    const testButton = buttons.find((btn) => btn.querySelector("[data-testid='play-icon']"));
    expect(testButton).toBeDisabled();
  });

  it("shows provider fields when enhancement is enabled and provider was previously tested", async () => {
    const LlmPanel = await loadLlmPanel();
    const config = createDefaultConfig();
    config.enableLlmEnhancement = true;
    config.llmConfigHash = "previously-tested";

    useConfigStore.setState({ config, setupComplete: true });

    renderWithI18n(<LlmPanel />);

    // Default provider is "foundry", should render FoundryFields
    expect(screen.getByTestId("foundry-fields")).toBeInTheDocument();
    // Provider select should be visible
    expect(screen.getByTestId("llm-provider")).toBeInTheDocument();
  });

  it("does not show provider fields when enhancement is disabled", async () => {
    const LlmPanel = await loadLlmPanel();
    const config = createDefaultConfig();
    config.enableLlmEnhancement = false;

    useConfigStore.setState({ config, setupComplete: true });

    renderWithI18n(<LlmPanel />);

    // No provider fields or provider select when enhancement is disabled
    expect(screen.queryByTestId("foundry-fields")).not.toBeInTheDocument();
    expect(screen.queryByTestId("llm-provider")).not.toBeInTheDocument();
  });

  it("shows correct provider fields when provider is bedrock", async () => {
    const LlmPanel = await loadLlmPanel();
    const config = createDefaultConfig();
    config.enableLlmEnhancement = true;
    config.llm.provider = "bedrock";
    config.llmConfigHash = "previously-tested";

    useConfigStore.setState({ config, setupComplete: true });

    renderWithI18n(<LlmPanel />);

    expect(screen.getByTestId("bedrock-fields")).toBeInTheDocument();
    expect(screen.queryByTestId("foundry-fields")).not.toBeInTheDocument();
  });

  it("shows correct provider fields for openai", async () => {
    const LlmPanel = await loadLlmPanel();
    const config = createDefaultConfig();
    config.enableLlmEnhancement = true;
    config.llm.provider = "openai";
    config.llmConfigHash = "previously-tested";

    useConfigStore.setState({ config, setupComplete: true });

    renderWithI18n(<LlmPanel />);

    expect(screen.getByTestId("openai-fields-openai")).toBeInTheDocument();
    expect(screen.queryByTestId("foundry-fields")).not.toBeInTheDocument();
  });

  it("calls llm.test IPC and shows success on test connection", async () => {
    const LlmPanel = await loadLlmPanel();
    const user = userEvent.setup();
    const config = createDefaultConfig();
    config.enableLlmEnhancement = true;
    config.llmConfigHash = "previously-tested";

    useConfigStore.setState({ config, setupComplete: true });

    vi.mocked(voxApi.llm.test).mockResolvedValue({ ok: true });
    vi.mocked(voxApi.config.load).mockResolvedValue({
      ...config,
      llmConnectionTested: true,
      llmConfigHash: "abc123",
    });

    renderWithI18n(<LlmPanel />);

    // Find the test connection button by its play icon sibling
    const buttons = screen.getAllByRole("button");
    const testButton = buttons.find((btn) => btn.querySelector("[data-testid='play-icon']"));
    expect(testButton).toBeTruthy();

    await user.click(testButton!);

    await waitFor(() => {
      expect(voxApi.llm.test).toHaveBeenCalledWith(config);
    });

    await waitFor(() => {
      const statusBox = screen.getByTestId("status-box");
      expect(statusBox).toHaveAttribute("data-type", "success");
    });
  });

  it("shows error status when test connection fails", async () => {
    const LlmPanel = await loadLlmPanel();
    const user = userEvent.setup();
    const config = createDefaultConfig();
    config.enableLlmEnhancement = true;
    config.llmConfigHash = "previously-tested";

    useConfigStore.setState({ config, setupComplete: true });

    vi.mocked(voxApi.llm.test).mockResolvedValue({ ok: false, error: "Connection refused" });
    vi.mocked(voxApi.config.load).mockResolvedValue(config);

    renderWithI18n(<LlmPanel />);

    const buttons = screen.getAllByRole("button");
    const testButton = buttons.find((btn) => btn.querySelector("[data-testid='play-icon']"));
    expect(testButton).toBeTruthy();

    await user.click(testButton!);

    await waitFor(() => {
      const statusBox = screen.getByTestId("status-box");
      expect(statusBox).toHaveAttribute("data-type", "error");
    });
  });
});

function promptConfig() {
  const config = createDefaultConfig();
  config.enableLlmEnhancement = true;
  config.llmConfigHash = "previously-tested";
  config.prompts = [
    { id: "p1", name: "Cleanup", icon: "🧹", instructions: "Fix grammar" },
    { id: "p2", name: "Formal", icon: "🎩", instructions: "Be formal" },
    { id: "p3", name: "Short", icon: "✂️", instructions: "Be brief" },
  ];
  config.activePromptId = "p1";
  return config;
}

/** Stands in for App.tsx, which shows a spinner instead of the panels while the config store is loading. */
function SettingsWindow({ Panel }: { Panel: () => React.ReactElement | null }) {
  const loading = useConfigStore((s) => s.loading);
  return loading ? null : <Panel />;
}

function savedConfigs() {
  return vi.mocked(voxApi.config.save).mock.calls.map(([saved]) => saved);
}

function promptList() {
  return within(screen.getByRole("list", { name: "Prompts" }));
}

async function openPromptTab(user: UserEvent) {
  await user.click(screen.getByRole("button", { name: "Custom Prompt" }));
}

describe("LlmPanel prompt list", () => {
  it("editing a non-active prompt keeps the active one", async () => {
    const LlmPanel = await loadLlmPanel();
    const user = userEvent.setup();
    useConfigStore.setState({ config: promptConfig(), setupComplete: true });
    renderWithI18n(<LlmPanel />);

    await openPromptTab(user);
    await user.click(promptList().getByRole("button", { name: /Short/ }));
    const instructions = screen.getByLabelText("Custom Instructions");
    await user.clear(instructions);
    await user.type(instructions, "Keep it to one line");

    await waitFor(() => {
      const saved = savedConfigs().at(-1);
      expect(saved?.prompts[2]).toEqual({ id: "p3", name: "Short", icon: "✂️", instructions: "Keep it to one line" });
    });
    expect(savedConfigs().at(-1)?.activePromptId).toBe("p1");
    expect(savedConfigs().at(-1)?.prompts[0].instructions).toBe("Fix grammar");
    expect(voxApi.prompts.setActive).not.toHaveBeenCalled();
  });

  it("second click deletes the active prompt and makes none active", async () => {
    const LlmPanel = await loadLlmPanel();
    const user = userEvent.setup();
    useConfigStore.setState({ config: promptConfig(), setupComplete: true });
    renderWithI18n(<LlmPanel />);

    await openPromptTab(user);
    await user.click(promptList().getByRole("button", { name: /Cleanup/ }));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(voxApi.config.save).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirm?" }));

    await waitFor(() => expect(voxApi.prompts.setActive).toHaveBeenCalledWith(null));
    expect(savedConfigs().at(-1)?.prompts.map((p) => p.id)).toEqual(["p2", "p3"]);
    expect(vi.mocked(voxApi.config.save).mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(voxApi.prompts.setActive).mock.invocationCallOrder[0]);
    expect(promptList().queryByRole("button", { name: /Cleanup/ })).not.toBeInTheDocument();
  });

  it("an unconfirmed delete keeps the prompt", async () => {
    const LlmPanel = await loadLlmPanel();
    const user = userEvent.setup();
    useConfigStore.setState({ config: promptConfig(), setupComplete: true });
    renderWithI18n(<LlmPanel />);

    await openPromptTab(user);
    await user.click(promptList().getByRole("button", { name: /Formal/ }));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("button", { name: "Confirm?" })).toBeInTheDocument();
    await user.click(screen.getByLabelText("Custom Instructions"));

    expect(screen.queryByRole("button", { name: "Confirm?" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(promptList().getByRole("button", { name: /Formal/ })).toBeInTheDocument();
    expect(voxApi.config.save).not.toHaveBeenCalled();
    expect(voxApi.prompts.setActive).not.toHaveBeenCalled();
  });

  it("template creates an editable copy", async () => {
    const LlmPanel = await loadLlmPanel();
    const user = userEvent.setup();
    const german = PROMPT_TEMPLATES.find((template) => template.id === "translate-de")!;
    const germanInstructions = german.instructions;
    useConfigStore.setState({ config: promptConfig(), setupComplete: true });
    renderWithI18n(<LlmPanel />);

    await openPromptTab(user);
    await user.click(screen.getByRole("button", { name: "From template" }));
    await user.click(screen.getByRole("button", { name: /Translate to German/ }));

    expect(screen.getByLabelText("Name")).toHaveValue("Translate to German");
    expect(screen.getByLabelText("Icon")).toHaveValue("🇩🇪");
    const instructions = screen.getByLabelText("Custom Instructions");
    expect(instructions).toHaveValue(germanInstructions);
    await waitFor(() => expect(savedConfigs().at(-1)?.prompts).toHaveLength(4));

    await user.clear(instructions);
    await user.type(instructions, "Translate to Swiss German");
    await waitFor(() => expect(savedConfigs().at(-1)?.prompts[3].instructions).toBe("Translate to Swiss German"));

    expect(german.instructions).toBe(germanInstructions);
    await user.click(screen.getByRole("button", { name: "From template" }));
    await user.click(within(screen.getByRole("group", { name: "From template" })).getByRole("button", { name: /Translate to German/ }));
    expect(screen.getByLabelText("Custom Instructions")).toHaveValue(germanInstructions);
    const prompts = useConfigStore.getState().config!.prompts;
    expect(prompts).toHaveLength(5);
    expect(prompts[3].instructions).toBe("Translate to Swiss German");
    expect(prompts[3].id).not.toBe(prompts[4].id);
  });

  it("template list is a plain disclosure that closes on a click elsewhere and on Escape", async () => {
    const LlmPanel = await loadLlmPanel();
    const user = userEvent.setup();
    useConfigStore.setState({ config: promptConfig(), setupComplete: true });
    renderWithI18n(<LlmPanel />);

    await openPromptTab(user);
    const toggle = screen.getByRole("button", { name: "From template" });
    await user.click(toggle);
    expect(screen.getByRole("button", { name: /Translate to German/ })).toBeInTheDocument();
    // No menu roles: they promise arrow-key navigation that is not there.
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
    expect(toggle).not.toHaveAttribute("aria-haspopup");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await user.click(promptList().getByRole("button", { name: /Formal/ }));
    expect(screen.queryByRole("button", { name: /Translate to German/ })).not.toBeInTheDocument();

    await user.click(toggle);
    expect(screen.getByRole("button", { name: /Translate to German/ })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("button", { name: /Translate to German/ })).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(voxApi.config.save).not.toHaveBeenCalled();
  });

  it("new prompt gets default name and icon", async () => {
    const LlmPanel = await loadLlmPanel();
    const user = userEvent.setup();
    useConfigStore.setState({ config: promptConfig(), setupComplete: true });
    renderWithI18n(<LlmPanel />);

    await openPromptTab(user);
    await user.click(screen.getByRole("button", { name: "New" }));

    expect(promptList().getByRole("button", { name: /New prompt/ })).toHaveAttribute("aria-current", "true");
    expect(screen.getByLabelText("Name")).toHaveValue("New prompt");
    expect(screen.getByLabelText("Icon")).toHaveValue("📝");
    expect(screen.getByLabelText("Custom Instructions")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Make active" })).toBeEnabled();
    await waitFor(() => expect(savedConfigs().at(-1)?.prompts).toHaveLength(4));
    expect(savedConfigs().at(-1)?.prompts[3]).toMatchObject({ name: "New prompt", icon: "📝", instructions: "" });
    expect(savedConfigs().at(-1)?.activePromptId).toBe("p1");
    expect(voxApi.prompts.setActive).not.toHaveBeenCalled();
  });

  it("an outside switch keeps the sub-tab, selection and typed text", async () => {
    const LlmPanel = await loadLlmPanel();
    const user = userEvent.setup();
    useConfigStore.setState({ config: promptConfig(), setupComplete: true, loading: false });
    renderWithI18n(<SettingsWindow Panel={LlmPanel} />);

    await openPromptTab(user);
    await user.click(promptList().getByRole("button", { name: /Short/ }));
    await user.type(screen.getByLabelText("Custom Instructions"), " and plain");

    const switchedOnDisk = { ...promptConfig(), activePromptId: "p2" };
    vi.mocked(voxApi.config.load).mockResolvedValue(switchedOnDisk);
    await act(() => useConfigStore.getState().loadConfig());

    expect(useConfigStore.getState().loading).toBe(false);
    expect(useConfigStore.getState().config?.activePromptId).toBe("p2");
    expect(screen.getByLabelText("Name")).toHaveValue("Short");
    expect(screen.getByLabelText("Custom Instructions")).toHaveValue("Be brief and plain");
    expect(screen.getByRole("button", { name: "Make active" })).toBeEnabled();
    await waitFor(() => expect(savedConfigs().at(-1)?.prompts[2].instructions).toBe("Be brief and plain"));
  });

  it("a failed connection test message stays after the config reload", async () => {
    const LlmPanel = await loadLlmPanel();
    const user = userEvent.setup();
    const config = { ...promptConfig(), llm: { provider: "foundry" as const, endpoint: "https://foundry.example", apiKey: "key", model: "gpt-4o" } };
    useConfigStore.setState({ config, setupComplete: true, loading: false });
    vi.mocked(voxApi.llm.test).mockResolvedValue({ ok: false, error: "Connection refused" });
    vi.mocked(voxApi.config.load).mockResolvedValue({ ...config, llmConnectionTested: false, llmConfigHash: "" });
    renderWithI18n(<SettingsWindow Panel={LlmPanel} />);

    const testButton = screen.getAllByRole("button").find((btn) => btn.querySelector("[data-testid='play-icon']"));
    await user.click(testButton!);
    await waitFor(() => expect(screen.getByTestId("status-box")).toHaveAttribute("data-type", "error"));

    await act(() => useConfigStore.getState().loadConfig());

    expect(screen.getByTestId("status-box")).toHaveAttribute("data-type", "error");
    expect(screen.getByTestId("status-box")).toHaveTextContent("Connection refused");
  });

  it("a prompt-settings navigation opens the Custom Prompt sub-tab", async () => {
    const LlmPanel = await loadLlmPanel();
    vi.mocked(voxApi.config.load).mockResolvedValue(promptConfig());

    // The settings window was closed: the navigation reaches a window that has not loaded the config yet.
    await act(() => useConfigStore.getState().openPromptSettings());
    await act(() => useConfigStore.getState().loadConfig());
    renderWithI18n(<SettingsWindow Panel={LlmPanel} />);

    expect(useConfigStore.getState().activeTab).toBe(Tabs.AI_ENHANCEMENT);
    expect(screen.getByRole("button", { name: "Custom Prompt" })).toHaveClass("mock-form-active");
    expect(promptList().getByRole("button", { name: /Cleanup/ })).toBeInTheDocument();
  });
});
