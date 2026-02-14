import { useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon } from "../../../shared/icons";
import styles from "./CustomSelect.module.scss";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectDivider {
  divider: true;
  label?: string;
}

export type SelectItem = SelectOption | SelectDivider;

function isDivider(item: SelectItem): item is SelectDivider {
  return "divider" in item;
}

interface CustomSelectProps {
  value: string;
  items: SelectItem[];
  onChange: (value: string) => void;
  id?: string;
}

export function CustomSelect({ value, items, onChange, id }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(-1);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const options = items.filter((item): item is SelectOption => !isDivider(item));
  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;

  const getOptionIndices = useCallback(() => {
    const indices: number[] = [];
    items.forEach((item, i) => {
      if (!isDivider(item)) indices.push(i);
    });
    return indices;
  }, [items]);

  useLayoutEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (open && listRef.current) {
      const focused = listRef.current.querySelector(`.${styles.focused}`) as HTMLElement;
      if (focused) focused.scrollIntoView({ block: "nearest" });
    }
  }, [focusIndex, open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const optionIndices = getOptionIndices();

    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
        const currentIdx = items.findIndex((item) => !isDivider(item) && item.value === value);
        setFocusIndex(currentIdx >= 0 ? currentIdx : optionIndices[0]);
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "ArrowDown": {
        e.preventDefault();
        const currentPos = optionIndices.indexOf(focusIndex);
        const nextPos = currentPos < optionIndices.length - 1 ? currentPos + 1 : 0;
        setFocusIndex(optionIndices[nextPos]);
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        const currentPos = optionIndices.indexOf(focusIndex);
        const prevPos = currentPos > 0 ? currentPos - 1 : optionIndices.length - 1;
        setFocusIndex(optionIndices[prevPos]);
        break;
      }
      case "Enter":
      case " ": {
        e.preventDefault();
        const item = items[focusIndex];
        if (item && !isDivider(item)) {
          onChange(item.value);
          setOpen(false);
        }
        break;
      }
    }
  };

  const handleToggle = () => {
    if (!open) {
      const currentIdx = items.findIndex((item) => !isDivider(item) && item.value === value);
      setFocusIndex(currentIdx >= 0 ? currentIdx : getOptionIndices()[0]);
    }
    setOpen(!open);
  };

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        id={id}
        className={`${styles.trigger} ${open ? styles.open : ""}`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selectedLabel}</span>
        <ChevronDownIcon width={12} height={12} />
      </button>

      {open && createPortal(
        <div
          className={styles.dropdown}
          ref={listRef}
          role="listbox"
          style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
        >
          {items.map((item, i) => {
            if (isDivider(item)) {
              if (item.label) {
                return (
                  <div key={`d-${i}`} className={styles.divider}>
                    <span className={styles.dividerLabel}>{item.label}</span>
                  </div>
                );
              }
              return <div key={`d-${i}`} className={styles.dividerPlain} />;
            }

            const isSelected = item.value === value;
            const isFocused = i === focusIndex;

            return (
              <button
                key={item.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`${styles.option} ${isSelected ? styles.selected : ""} ${isFocused ? styles.focused : ""}`}
                onClick={() => {
                  onChange(item.value);
                  setOpen(false);
                }}
                onMouseEnter={() => setFocusIndex(i)}
              >
                {item.label}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}
