// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { RadioGroup } from "../../../src/renderer/components/ui/RadioGroup";

vi.mock("../../../src/renderer/components/ui/RadioGroup.module.scss", () => ({
  default: new Proxy({}, { get: (_, prop) => `mock-radio-${String(prop)}` }),
}));

afterEach(() => {
  cleanup();
});

describe("RadioGroup", () => {
  const options = [
    { value: "a", label: "Option A", description: "First option" },
    { value: "b", label: "Option B", description: "Second option", recommended: true },
  ];

  it("renders all options", () => {
    render(<RadioGroup name="test" value="a" options={options} onChange={() => {}} />);
    expect(screen.getByText("Option A")).toBeInTheDocument();
    expect(screen.getByText("Option B")).toBeInTheDocument();
    expect(screen.getByText("First option")).toBeInTheDocument();
    expect(screen.getByText("Second option")).toBeInTheDocument();
  });

  it("calls onChange when option is selected", () => {
    const onChange = vi.fn();
    render(<RadioGroup name="test" value="a" options={options} onChange={onChange} />);
    fireEvent.click(screen.getByText("Option B"));
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("shows recommended badge when option has recommended=true", () => {
    render(<RadioGroup name="test" value="a" options={options} onChange={() => {}} recommendedLabel="Recommended" />);
    expect(screen.getByText("Recommended")).toBeInTheDocument();
  });

  it("marks the selected option", () => {
    const { container } = render(<RadioGroup name="test" value="a" options={options} onChange={() => {}} />);
    const radios = container.querySelectorAll("input[type='radio']") as NodeListOf<HTMLInputElement>;
    expect(radios[0].checked).toBe(true);
    expect(radios[1].checked).toBe(false);
  });
});
