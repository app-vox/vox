// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { screen, cleanup, fireEvent } from "@testing-library/react";
import { installVoxApiMock, resetStores, renderWithI18n } from "../../helpers/setup";
import { TranscriptionTest } from "../../../../src/renderer/components/ui/TranscriptionTest";

vi.mock("../../../../src/renderer/components/ui/TranscriptionTest.module.scss", () => ({
  default: new Proxy({}, { get: (_, prop) => `mock-test-${String(prop)}` }),
}));

vi.mock("../../../../src/renderer/components/shared/buttons.module.scss", () => ({
  default: new Proxy({}, { get: (_, prop) => `mock-btn-${String(prop)}` }),
}));

vi.mock("../../../../src/renderer/components/ui/StatusBox", () => ({
  StatusBox: ({ text, type }: { text: string; type: string }) => (
    <div data-testid="status-box" data-type={type}>{text}</div>
  ),
}));

vi.mock("../../../../src/shared/icons", () => ({
  RecordIcon: (props: Record<string, unknown>) => <svg data-testid="record-icon" {...props} />,
}));

beforeEach(() => {
  installVoxApiMock();
  resetStores();
});

afterEach(() => {
  cleanup();
});

describe("TranscriptionTest", () => {
  it("renders test button", () => {
    renderWithI18n(
      <TranscriptionTest testing={false} result={null} error={null} onTest={vi.fn()} buttonText="Test Recording" />
    );
    expect(screen.getByText("Test Recording")).toBeInTheDocument();
  });

  it("calls onTest when button clicked", () => {
    const onTest = vi.fn();
    renderWithI18n(
      <TranscriptionTest testing={false} result={null} error={null} onTest={onTest} buttonText="Test" />
    );
    fireEvent.click(screen.getByText("Test"));
    expect(onTest).toHaveBeenCalledOnce();
  });

  it("disables button when testing", () => {
    renderWithI18n(
      <TranscriptionTest testing={true} result={null} error={null} onTest={vi.fn()} buttonText="Test" />
    );
    expect(screen.getByText("Test")).toBeDisabled();
  });

  it("shows raw text result", () => {
    renderWithI18n(
      <TranscriptionTest testing={false} result={{ rawText: "hello world", correctedText: null, llmError: null }} error={null} onTest={vi.fn()} buttonText="Test" />
    );
    expect(screen.getByTestId("status-box")).toHaveTextContent("hello world");
  });

  it("shows LLM result when showLlmResult is true", () => {
    renderWithI18n(
      <TranscriptionTest testing={false} result={{ rawText: "hello", correctedText: "Hello!", llmError: null }} error={null} onTest={vi.fn()} buttonText="Test" showLlmResult={true} />
    );
    const statusBox = screen.getByTestId("status-box");
    expect(statusBox).toHaveTextContent("hello");
    expect(statusBox).toHaveTextContent("Hello!");
  });

  it("shows error message", () => {
    renderWithI18n(
      <TranscriptionTest testing={false} result={null} error="Model not loaded" onTest={vi.fn()} buttonText="Test" />
    );
    const statusBox = screen.getByTestId("status-box");
    expect(statusBox).toHaveAttribute("data-type", "error");
  });
});
