// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useConfigStore } from "../../../src/renderer/stores/config-store";
import { createDefaultConfig } from "../../../src/shared/config";
import { installVoxApiMock, resetStores, renderWithI18n } from "../helpers/setup";
import type { VoxAPI } from "../../../src/preload/index";

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

// Mock use-debounced-save hook
vi.mock("../../../src/renderer/hooks/use-debounced-save", () => ({
  useDebouncedSave: () => ({ debouncedSave: vi.fn(), flush: vi.fn() }),
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
  voxApi = installVoxApiMock();
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
