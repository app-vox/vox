// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { screen, cleanup, fireEvent } from "@testing-library/react";
import { installVoxApiMock, resetStores, renderWithI18n } from "../../helpers/setup";
import { ModelSelector } from "../../../../src/renderer/components/ui/ModelSelector";
import type { ModelInfo } from "../../../../src/preload/index";

vi.mock("../../../../src/renderer/components/ui/ModelSelector.module.scss", () => ({
  default: new Proxy({}, { get: (_, prop) => `mock-model-${String(prop)}` }),
}));

vi.mock("../../../../src/renderer/components/shared/buttons.module.scss", () => ({
  default: new Proxy({}, { get: (_, prop) => `mock-btn-${String(prop)}` }),
}));

vi.mock("../../../../src/shared/icons", () => ({
  TrashIcon: (props: Record<string, unknown>) => <svg data-testid="trash-icon" {...props} />,
  XIcon: (props: Record<string, unknown>) => <svg data-testid="x-icon" {...props} />,
}));

const models: ModelInfo[] = [
  { size: "tiny", info: { description: "Tiny", sizeBytes: 100_000_000, label: "Tiny" }, downloaded: true },
  { size: "small", info: { description: "Small", sizeBytes: 500_000_000, label: "Small" }, downloaded: false },
];

beforeEach(() => {
  installVoxApiMock();
  resetStores();
});

afterEach(() => {
  cleanup();
});

describe("ModelSelector", () => {
  it("renders model list with radio buttons", () => {
    renderWithI18n(
      <ModelSelector models={models} selectedSize="tiny" downloading={null} progress={{ downloaded: 0, total: 0 }} onSelect={vi.fn()} onDownload={vi.fn()} onCancel={vi.fn()} onDelete={vi.fn()} />
    );
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
  });

  it("calls onSelect when clicking a downloaded model radio", () => {
    const onSelect = vi.fn();
    renderWithI18n(
      <ModelSelector models={models} selectedSize="" downloading={null} progress={{ downloaded: 0, total: 0 }} onSelect={onSelect} onDownload={vi.fn()} onCancel={vi.fn()} onDelete={vi.fn()} />
    );
    const radios = screen.getAllByRole("radio");
    fireEvent.click(radios[0]); // tiny (downloaded)
    expect(onSelect).toHaveBeenCalledWith("tiny");
  });

  it("shows download button for non-downloaded models", () => {
    const onDownload = vi.fn();
    renderWithI18n(
      <ModelSelector models={models} selectedSize="tiny" downloading={null} progress={{ downloaded: 0, total: 0 }} onSelect={vi.fn()} onDownload={onDownload} onCancel={vi.fn()} onDelete={vi.fn()} />
    );
    const downloadBtn = screen.getByText("Download");
    fireEvent.click(downloadBtn);
    expect(onDownload).toHaveBeenCalledWith("small");
  });

  it("shows progress bar when downloading", () => {
    const { container } = renderWithI18n(
      <ModelSelector models={models} selectedSize="tiny" downloading="small" progress={{ downloaded: 250_000_000, total: 500_000_000 }} onSelect={vi.fn()} onDownload={vi.fn()} onCancel={vi.fn()} onDelete={vi.fn()} />
    );
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(container.querySelector("[data-testid='x-icon']")).toBeInTheDocument();
  });

  it("calls onCancel when clicking cancel during download", () => {
    const onCancel = vi.fn();
    renderWithI18n(
      <ModelSelector models={models} selectedSize="tiny" downloading="small" progress={{ downloaded: 100, total: 500 }} onSelect={vi.fn()} onDownload={vi.fn()} onCancel={onCancel} onDelete={vi.fn()} />
    );
    // Find the cancel button by its title attribute
    const cancelBtn = screen.getByTitle("Cancel download");
    fireEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalled();
  });

  it("shows downloaded badge and delete button for downloaded models", () => {
    renderWithI18n(
      <ModelSelector models={models} selectedSize="tiny" downloading={null} progress={{ downloaded: 0, total: 0 }} onSelect={vi.fn()} onDownload={vi.fn()} onCancel={vi.fn()} onDelete={vi.fn()} />
    );
    expect(screen.getByText("Downloaded")).toBeInTheDocument();
    expect(screen.getByTestId("trash-icon")).toBeInTheDocument();
  });

  it("shows recommended badge", () => {
    renderWithI18n(
      <ModelSelector models={models} selectedSize="tiny" downloading={null} progress={{ downloaded: 0, total: 0 }} onSelect={vi.fn()} onDownload={vi.fn()} onCancel={vi.fn()} onDelete={vi.fn()} recommendedSize="small" />
    );
    expect(screen.getByText("Recommended")).toBeInTheDocument();
  });
});
