import { useState, useRef, useEffect, useCallback, useLayoutEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon, PlayIcon } from "../../../shared/icons";
import styles from "./CustomSelect.module.scss";

export interface SelectOption {
  value: string;
  label: string;
  suffix?: ReactNode;
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
  onPreview?: (value: string) => void;
  id?: string;
  disabled?: boolean;
}

interface MultiSelectProps {
  values: string[];
  items: SelectItem[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  removeLabel?: (label: string) => string;
  disabled?: boolean;
}

export function CustomSelect({ value, items, onChange, onPreview, id, disabled }: CustomSelectProps) {
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

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, []);

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handleScroll = () => setOpen(false);
    const scrollContainer = triggerRef.current?.closest("[class*='content']") ?? window;
    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", updatePosition);
    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

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
    if (disabled) return;
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
        className={`${styles.trigger} ${open ? styles.open : ""} ${disabled ? styles.disabled : ""}`}
        disabled={disabled}
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
              <div
                key={item.value}
                role="option"
                aria-selected={isSelected}
                className={`${styles.option} ${isSelected ? styles.selected : ""} ${isFocused ? styles.focused : ""}`}
                onMouseEnter={() => setFocusIndex(i)}
              >
                {onPreview && item.value !== "none" && (
                  <button
                    type="button"
                    className={styles.previewBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreview(item.value);
                    }}
                    tabIndex={-1}
                  >
                    <PlayIcon width={8} height={8} />
                  </button>
                )}
                <button
                  type="button"
                  className={styles.optionLabel}
                  onClick={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  {item.label}
                </button>
                {item.suffix && (
                  <span className={styles.suffix}>{item.suffix}</span>
                )}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}

export function MultiSelect({ values, items, onAdd, onRemove, placeholder, searchPlaceholder, removeLabel, disabled }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(-1);
  const [search, setSearch] = useState("");
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const allOptions = items.filter((item): item is SelectOption => !isDivider(item));
  const available = items.filter((item) => {
    if (isDivider(item)) return true;
    return !values.includes(item.value);
  });
  const selectedItems = values.map((v) => allOptions.find((i) => i.value === v)).filter(Boolean) as SelectOption[];

  const query = search.toLowerCase();
  const filtered = query
    ? available.filter((item) => {
        if (isDivider(item)) return false;
        return item.label.toLowerCase().includes(query);
      })
    : available;

  const filteredOptions = filtered.filter((item): item is SelectOption => !isDivider(item));

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, []);

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handleScroll = () => setOpen(false);
    const scrollContainer = triggerRef.current?.closest("[class*='content']") ?? window;
    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", updatePosition);
    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

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

  useEffect(() => {
    if (open) requestAnimationFrame(() => searchRef.current?.focus());
  }, [open]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "ArrowDown":
        e.preventDefault();
        setFocusIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
        break;
      case "Enter": {
        e.preventDefault();
        const item = filteredOptions[focusIndex];
        if (item) {
          onAdd(item.value);
          setSearch("");
          setFocusIndex((prev) => Math.min(prev, filteredOptions.length - 2));
        }
        break;
      }
    }
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      if (!disabled) {
        setSearch("");
        setOpen(true);
        setFocusIndex(0);
      }
    }
  };

  const handleToggle = () => {
    if (disabled) return;
    if (!open) {
      setFocusIndex(0);
      setSearch("");
    }
    setOpen(!open);
  };

  const hasAvailable = allOptions.some((item) => !values.includes(item.value));

  return (
    <>
      <div
        ref={triggerRef}
        className={`${styles.trigger} ${styles.multiTrigger} ${open ? styles.open : ""} ${disabled ? styles.disabled : ""}`}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        onClick={handleToggle}
        onKeyDown={handleTriggerKeyDown}
      >
        <div className={styles.multiChips}>
          {selectedItems.map((item) => (
            <span key={item.value} className={styles.multiChip}>
              {item.label}
              <button
                type="button"
                className={styles.multiChipRemove}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(item.value);
                }}
                aria-label={removeLabel?.(item.label) ?? `Remove ${item.label}`}
                tabIndex={-1}
              >
                {/* eslint-disable-next-line i18next/no-literal-string */}
                <span aria-hidden="true">&times;</span>
              </button>
            </span>
          ))}
          {hasAvailable && (
            <span className={styles.multiPlaceholder}>{placeholder}</span>
          )}
        </div>
        <ChevronDownIcon width={12} height={12} />
      </div>

      {open && createPortal(
        <div
          className={styles.dropdown}
          ref={listRef}
          role="listbox"
          aria-multiselectable="true"
          style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
        >
          <div className={styles.searchBox}>
            <input
              ref={searchRef}
              type="text"
              className={styles.searchInput}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setFocusIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder={searchPlaceholder ?? placeholder}
            />
          </div>
          {filtered.map((item, i) => {
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

            const optionIdx = filteredOptions.indexOf(item);
            return (
              <div
                key={item.value}
                role="option"
                aria-selected={false}
                className={`${styles.option} ${optionIdx === focusIndex ? styles.focused : ""}`}
                onMouseEnter={() => setFocusIndex(optionIdx)}
              >
                <button
                  type="button"
                  className={styles.optionLabel}
                  onClick={() => {
                    onAdd(item.value);
                    setSearch("");
                    setFocusIndex((prev) => Math.min(prev, filteredOptions.length - 2));
                  }}
                >
                  {item.label}
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}
