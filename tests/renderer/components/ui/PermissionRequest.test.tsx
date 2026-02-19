// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { screen, cleanup, fireEvent } from "@testing-library/react";
import { installVoxApiMock, resetStores, renderWithI18n } from "../../helpers/setup";
import { PermissionRequest } from "../../../../src/renderer/components/ui/PermissionRequest";

vi.mock("../../../../src/renderer/components/ui/PermissionRequest.module.scss", () => ({
  default: new Proxy({}, { get: (_, prop) => `mock-perm-${String(prop)}` }),
}));

vi.mock("../../../../src/renderer/components/shared/buttons.module.scss", () => ({
  default: new Proxy({}, { get: (_, prop) => `mock-btn-${String(prop)}` }),
}));

beforeEach(() => {
  installVoxApiMock();
  resetStores();
});

afterEach(() => {
  cleanup();
});

describe("PermissionRequest", () => {
  it("renders name and description", () => {
    renderWithI18n(
      <PermissionRequest
        icon={<svg data-testid="icon" />}
        name="Microphone"
        description="Required for recording"
        granted={false}
      />
    );
    expect(screen.getByText("Microphone")).toBeInTheDocument();
    expect(screen.getByText("Required for recording")).toBeInTheDocument();
  });

  it("shows granted badge when granted", () => {
    renderWithI18n(
      <PermissionRequest icon={<svg />} name="Microphone" description="desc" granted={true} />
    );
    expect(screen.getByText("Granted")).toBeInTheDocument();
  });

  it("shows request button when not granted", () => {
    const onRequest = vi.fn();
    renderWithI18n(
      <PermissionRequest icon={<svg />} name="Mic" description="desc" granted={false} buttonText="Grant Access" onRequest={onRequest} />
    );
    const button = screen.getByText("Grant Access");
    fireEvent.click(button);
    expect(onRequest).toHaveBeenCalledOnce();
  });

  it("disables button when requesting", () => {
    renderWithI18n(
      <PermissionRequest icon={<svg />} name="Mic" description="desc" granted={false} buttonText="Grant Access" onRequest={vi.fn()} requesting={true} />
    );
    // The i18n key "permissions.requesting" renders as "Requesting…" in the en.json locale
    // Just check the button is disabled
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toBeDisabled();
  });

  it("shows custom status text", () => {
    renderWithI18n(
      <PermissionRequest icon={<svg />} name="Mic" description="desc" granted={false} statusText="Denied" />
    );
    expect(screen.getByText("Denied")).toBeInTheDocument();
  });
});
