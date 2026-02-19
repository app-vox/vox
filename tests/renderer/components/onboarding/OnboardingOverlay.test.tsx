// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { useConfigStore } from "../../../../src/renderer/stores/config-store";
import { usePermissionsStore } from "../../../../src/renderer/stores/permissions-store";
import { useOnboardingStore } from "../../../../src/renderer/components/onboarding/use-onboarding-store";
import { createDefaultConfig } from "../../../../src/shared/config";
import { installVoxApiMock, resetStores, renderWithI18n } from "../../helpers/setup";
import type { VoxAPI } from "../../../../src/preload/index";
import { OnboardingOverlay } from "../../../../src/renderer/components/onboarding/OnboardingOverlay";

vi.mock("../../../../src/renderer/components/onboarding/OnboardingOverlay.module.scss", () => ({
  default: new Proxy({}, { get: (_, prop) => `mock-onboarding-${String(prop)}` }),
}));
vi.mock("../../../../src/renderer/components/shared/buttons.module.scss", () => ({
  default: new Proxy({}, { get: (_, prop) => `mock-btn-${String(prop)}` }),
}));
vi.mock("../../../../src/renderer/components/shared/card.module.scss", () => ({
  default: new Proxy({}, { get: (_, prop) => `mock-card-${String(prop)}` }),
}));
vi.mock("../../../../src/renderer/components/permissions/PermissionRow.module.scss", () => ({
  default: new Proxy({}, { get: (_, prop) => `mock-perm-${String(prop)}` }),
}));
vi.mock("../../../../src/renderer/components/whisper/ModelRow.module.scss", () => ({
  default: new Proxy({}, { get: (_, prop) => `mock-model-${String(prop)}` }),
}));

vi.mock("../../../../src/shared/icons", () => ({
  MicIcon: (props: Record<string, unknown>) => <svg data-testid="mic-icon" {...props} />,
  MicSimpleIcon: (props: Record<string, unknown>) => <svg data-testid="mic-simple-icon" {...props} />,
  LockIcon: (props: Record<string, unknown>) => <svg data-testid="lock-icon" {...props} />,
  RecordIcon: (props: Record<string, unknown>) => <svg data-testid="record-icon" {...props} />,
  AlertTriangleIcon: (props: Record<string, unknown>) => <svg data-testid="alert-icon" {...props} />,
  XIcon: (props: Record<string, unknown>) => <svg data-testid="x-icon" {...props} />,
  SparkleIcon: (props: Record<string, unknown>) => <svg data-testid="sparkle-icon" {...props} />,
  TrashIcon: (props: Record<string, unknown>) => <svg data-testid="trash-icon" {...props} />,
}));

vi.mock("../../../../src/renderer/components/ui/OfflineBanner", () => ({
  OfflineBanner: () => null,
}));

vi.mock("../../../../src/renderer/hooks/use-online-status", () => ({
  useOnlineStatus: () => true,
}));

let voxApi: VoxAPI;

beforeEach(() => {
  vi.restoreAllMocks();
  resetStores();
  useOnboardingStore.getState().reset();
  usePermissionsStore.setState({ status: null, keychainStatus: null });
  voxApi = installVoxApiMock();
  Element.prototype.scrollIntoView = vi.fn();

  const config = createDefaultConfig();
  useConfigStore.setState({
    config,
    loading: false,
    setupComplete: true,
  });
});

afterEach(() => {
  cleanup();
});

describe("OnboardingOverlay", () => {
  it("renders welcome step by default", () => {
    renderWithI18n(<OnboardingOverlay />);
    expect(screen.getByText("Welcome to Vox")).toBeInTheDocument();
    expect(screen.getByText("Get Started")).toBeInTheDocument();
  });

  it("shows skip button on welcome step", () => {
    renderWithI18n(<OnboardingOverlay />);
    expect(screen.getByText("Skip Setup")).toBeInTheDocument();
  });

  it("does not show back button on welcome step", () => {
    renderWithI18n(<OnboardingOverlay />);
    expect(screen.queryByText("Back")).not.toBeInTheDocument();
  });

  it("advances to model download step on Get Started click", () => {
    renderWithI18n(<OnboardingOverlay />);
    fireEvent.click(screen.getByText("Get Started"));
    expect(useOnboardingStore.getState().step).toBe(1);
  });

  it("shows back button on model download step", () => {
    useOnboardingStore.setState({ step: 1 });
    renderWithI18n(<OnboardingOverlay />);
    expect(screen.getByText("Back")).toBeInTheDocument();
  });

  it("renders permissions step at step 2", () => {
    useOnboardingStore.setState({ step: 2 });
    renderWithI18n(<OnboardingOverlay />);
    expect(screen.getByText(/Permissions/)).toBeInTheDocument();
  });

  it("renders shortcut learn step at step 3", () => {
    useOnboardingStore.setState({ step: 3 });
    renderWithI18n(<OnboardingOverlay />);
    expect(screen.getByText(/How to Record/)).toBeInTheDocument();
  });

  it("renders try it step at step 4", () => {
    useOnboardingStore.setState({ step: 4 });
    renderWithI18n(<OnboardingOverlay />);
    const matches = screen.getAllByText(/Try Your First Recording/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("renders HUD demo step at step 5", () => {
    useOnboardingStore.setState({ step: 5 });
    renderWithI18n(<OnboardingOverlay />);
    expect(screen.getByText(/Recording Widget/)).toBeInTheDocument();
  });

  it("renders LLM intro step at step 6", () => {
    useOnboardingStore.setState({ step: 6 });
    renderWithI18n(<OnboardingOverlay />);
    expect(screen.getByText(/AI Enhancement/)).toBeInTheDocument();
  });

  it("renders done step at step 7", () => {
    useOnboardingStore.setState({ step: 7 });
    renderWithI18n(<OnboardingOverlay />);
    expect(screen.getByText("You're All Set!")).toBeInTheDocument();
  });

  it("skipping sets onboardingCompleted to true and saves", async () => {
    renderWithI18n(<OnboardingOverlay />);
    fireEvent.click(screen.getByText("Skip Setup"));

    await waitFor(() => {
      expect(useConfigStore.getState().config?.onboardingCompleted).toBe(true);
    });
    expect(voxApi.config.save).toHaveBeenCalled();
  });

  it("renders step indicator dots", () => {
    const { container } = renderWithI18n(<OnboardingOverlay />);
    const dots = container.querySelectorAll("[class*='dot']");
    expect(dots.length).toBeGreaterThanOrEqual(8);
  });

  it("back button goes to previous step", () => {
    useOnboardingStore.setState({ step: 2 });
    renderWithI18n(<OnboardingOverlay />);
    fireEvent.click(screen.getByText("Back"));
    expect(useOnboardingStore.getState().step).toBe(1);
  });

  it("shows back and skip buttons on HUD demo step", () => {
    useOnboardingStore.setState({ step: 5 });
    renderWithI18n(<OnboardingOverlay />);
    expect(screen.getByText("Back")).toBeInTheDocument();
    expect(screen.getByText("Skip Setup")).toBeInTheDocument();
  });

  it("shows back and skip buttons on LLM intro step", () => {
    useOnboardingStore.setState({ step: 6 });
    renderWithI18n(<OnboardingOverlay />);
    expect(screen.getByText("Back")).toBeInTheDocument();
    expect(screen.getByText("Skip Setup")).toBeInTheDocument();
  });

  it("fires onboarding_started event with is_first_time true on mount", () => {
    renderWithI18n(<OnboardingOverlay />);
    expect(voxApi.analytics.track).toHaveBeenCalledWith("onboarding_started", { is_first_time: true });
  });

  it("fires onboarding_started event with is_first_time false when force opened", () => {
    useOnboardingStore.setState({ forceOpen: true });
    renderWithI18n(<OnboardingOverlay />);
    expect(voxApi.analytics.track).toHaveBeenCalledWith("onboarding_started", { is_first_time: false });
  });

  it("fires onboarding_skipped event when user skips", async () => {
    useOnboardingStore.setState({ step: 3 });
    renderWithI18n(<OnboardingOverlay />);
    fireEvent.click(screen.getByText("Skip Setup"));

    await waitFor(() => {
      expect(voxApi.analytics.track).toHaveBeenCalledWith("onboarding_skipped", { skipped_at_step: 3 });
    });
  });

  it("fires onboarding_completed event when user finishes", async () => {
    useOnboardingStore.setState({ step: 7 });
    renderWithI18n(<OnboardingOverlay />);
    fireEvent.click(screen.getByText("Start Using Vox"));

    await waitFor(() => {
      expect(voxApi.analytics.track).toHaveBeenCalledWith("onboarding_completed", { completed_step: 7, skipped: false });
    });
  });
});
