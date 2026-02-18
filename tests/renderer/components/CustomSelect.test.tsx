// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomSelect, MultiSelect, type SelectItem } from "../../../src/renderer/components/ui/CustomSelect";

// Mock SCSS modules
vi.mock("../../../src/renderer/components/ui/CustomSelect.module.scss", () => ({
  default: new Proxy({}, { get: (_, prop) => `mock-${String(prop)}` }),
}));

// Mock icon components
vi.mock("../../../src/shared/icons", () => ({
  ChevronDownIcon: (props: Record<string, unknown>) => <svg data-testid="chevron-icon" {...props} />,
  PlayIcon: (props: Record<string, unknown>) => <svg data-testid="play-icon" {...props} />,
}));

const items: SelectItem[] = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Charlie" },
];

const itemsWithDivider: SelectItem[] = [
  { value: "a", label: "Alpha" },
  { divider: true, label: "Section" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Charlie" },
];

beforeEach(() => {
  vi.restoreAllMocks();
  // jsdom does not implement scrollIntoView
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
});

describe("CustomSelect", () => {
  it("shows the selected label in the trigger", () => {
    render(<CustomSelect value="b" items={items} onChange={vi.fn()} />);
    expect(screen.getByRole("button")).toHaveTextContent("Beta");
  });

  it("opens dropdown on click", async () => {
    const user = userEvent.setup();
    render(<CustomSelect value="a" items={items} onChange={vi.fn()} />);

    await user.click(screen.getByRole("button"));

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("opens on Enter key when closed", async () => {
    const user = userEvent.setup();
    render(<CustomSelect value="a" items={items} onChange={vi.fn()} />);

    screen.getByRole("button").focus();
    await user.keyboard("{Enter}");

    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("opens on Space key when closed", async () => {
    const user = userEvent.setup();
    render(<CustomSelect value="a" items={items} onChange={vi.fn()} />);

    screen.getByRole("button").focus();
    await user.keyboard(" ");

    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("opens on ArrowDown key when closed", async () => {
    const user = userEvent.setup();
    render(<CustomSelect value="a" items={items} onChange={vi.fn()} />);

    screen.getByRole("button").focus();
    await user.keyboard("{ArrowDown}");

    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("selects an option on click and closes", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<CustomSelect value="a" items={items} onChange={onChange} />);

    await user.click(screen.getByRole("button"));
    await user.click(screen.getByText("Charlie"));

    expect(onChange).toHaveBeenCalledWith("c");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes on Escape without selecting", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<CustomSelect value="a" items={items} onChange={onChange} />);

    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("navigates with ArrowDown/ArrowUp and selects with Enter", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<CustomSelect value="a" items={items} onChange={onChange} />);

    screen.getByRole("button").focus();
    await user.keyboard("{Enter}");    // open (focuses on "a" at index 0)
    await user.keyboard("{ArrowDown}"); // move to "b"
    await user.keyboard("{ArrowDown}"); // move to "c"
    await user.keyboard("{Enter}");     // select "c"

    expect(onChange).toHaveBeenCalledWith("c");
  });

  it("skips dividers when navigating with arrow keys", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<CustomSelect value="a" items={itemsWithDivider} onChange={onChange} />);

    screen.getByRole("button").focus();
    await user.keyboard("{Enter}");    // open (focuses on "a" at index 0)
    await user.keyboard("{ArrowDown}"); // should skip divider, land on "b"
    await user.keyboard("{Enter}");     // select "b"

    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("wraps around when ArrowDown reaches the end", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<CustomSelect value="c" items={items} onChange={onChange} />);

    screen.getByRole("button").focus();
    await user.keyboard("{Enter}");    // open (focuses on "c" at index 2)
    await user.keyboard("{ArrowDown}"); // wrap to "a"
    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledWith("a");
  });

  it("closes on click outside", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <CustomSelect value="a" items={items} onChange={vi.fn()} />
        <button type="button">Outside</button>
      </div>
    );

    // Click the CustomSelect trigger (the button with "Alpha")
    const buttons = screen.getAllByRole("button");
    const trigger = buttons.find(b => b.textContent?.includes("Alpha"));
    await user.click(trigger!);
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.click(screen.getByText("Outside"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});

const multiItems = [
  { value: "en", label: "English" },
  { value: "pt", label: "Portuguese" },
  { value: "es", label: "Spanish" },
];

describe("MultiSelect", () => {
  it("renders selected chips inside the trigger", () => {
    render(
      <MultiSelect values={["en", "pt"]} items={multiItems} onAdd={vi.fn()} onRemove={vi.fn()} />
    );
    expect(screen.getByText("English")).toBeInTheDocument();
    expect(screen.getByText("Portuguese")).toBeInTheDocument();
  });

  it("shows placeholder text", () => {
    render(
      <MultiSelect values={[]} items={multiItems} onAdd={vi.fn()} onRemove={vi.fn()} placeholder="Add a language..." />
    );
    expect(screen.getByText("Add a language...")).toBeInTheDocument();
  });

  it("opens dropdown showing only unselected items", async () => {
    const user = userEvent.setup();
    render(
      <MultiSelect values={["en"]} items={multiItems} onAdd={vi.fn()} onRemove={vi.fn()} />
    );

    await user.click(screen.getByRole("combobox"));

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(screen.getByText("Portuguese")).toBeInTheDocument();
    expect(screen.getByText("Spanish")).toBeInTheDocument();
  });

  it("calls onAdd when selecting an option", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(
      <MultiSelect values={["en"]} items={multiItems} onAdd={onAdd} onRemove={vi.fn()} />
    );

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByText("Spanish"));

    expect(onAdd).toHaveBeenCalledWith("es");
  });

  it("calls onRemove when clicking chip remove button", async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(
      <MultiSelect values={["en", "pt"]} items={multiItems} onAdd={vi.fn()} onRemove={onRemove} removeLabel={(l) => `Remove ${l}`} />
    );

    const removeBtn = screen.getByLabelText("Remove English");
    await user.click(removeBtn);

    expect(onRemove).toHaveBeenCalledWith("en");
  });

  it("keeps dropdown open after selecting (multi-pick)", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(
      <MultiSelect values={[]} items={multiItems} onAdd={onAdd} onRemove={vi.fn()} />
    );

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByText("English"));

    expect(onAdd).toHaveBeenCalledWith("en");
    // Dropdown should still be visible (it re-renders with updated available items)
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });
});
