import { useState, useRef, useCallback, useEffect } from "react";
import { useT } from "../../i18n-context";
import log from "../../logger";
import { isDoubleTap, getDoubleTapModifier, DOUBLE_TAP_PREFIX, DOUBLE_TAP_THRESHOLD_MS } from "../../../shared/shortcuts";

const slog = log.scope("ShortcutRecorder");

import styles from "./ShortcutRecorder.module.scss";
import form from "../shared/forms.module.scss";

const CODE_TO_KEY: Record<string, string> = {
  Space: "Space", Enter: "Enter", Backspace: "Backspace", Tab: "Tab",
  ArrowUp: "Up", ArrowDown: "Down", ArrowLeft: "Left", ArrowRight: "Right",
  Delete: "Delete", Home: "Home", End: "End", PageUp: "PageUp", PageDown: "PageDown",
  Minus: "-", Equal: "=", BracketLeft: "[", BracketRight: "]",
  Backslash: "\\", Semicolon: ";", Quote: "'", Comma: ",", Period: ".", Slash: "/",
  Backquote: "`",
  BrightnessDown: "BrightnessDown", BrightnessUp: "BrightnessUp",
  AudioVolumeDown: "AudioVolumeDown", AudioVolumeUp: "AudioVolumeUp", AudioVolumeMute: "AudioVolumeMute",
  MediaPlayPause: "MediaPlayPause", MediaStop: "MediaStop",
  MediaTrackPrevious: "MediaTrackPrevious", MediaTrackNext: "MediaTrackNext",
  LaunchApp1: "LaunchApp1", LaunchApp2: "LaunchApp2",
};

for (let i = 65; i <= 90; i++) {
  const ch = String.fromCharCode(i);
  CODE_TO_KEY[`Key${ch}`] = ch;
}
for (let i = 0; i <= 9; i++) CODE_TO_KEY[`Digit${i}`] = String(i);
for (let i = 1; i <= 24; i++) CODE_TO_KEY[`F${i}`] = `F${i}`;

function isModifierCode(code: string): boolean {
  return code.startsWith("Shift") || code.startsWith("Control") ||
         code.startsWith("Alt") || code.startsWith("Meta") ||
         code === "Fn" || code === "FnLock";
}

const PLATFORM_LABELS: Record<string, string> = {
  Command: "\u2318", Ctrl: "\u2303", Alt: "\u2325", Shift: "\u21E7", Fn: "Fn",
};

function parseAccelerator(accelerator: string): string[] {
  return accelerator.split("+");
}

interface ShortcutRecorderProps {
  label: string;
  hint: string;
  value: string;
  otherValue: string;
  onChange: (accelerator: string) => void;
  disabled?: boolean;
}

export function ShortcutRecorder({ label, hint, value, otherValue, onChange, disabled }: ShortcutRecorderProps) {
  const t = useT();
  const [recording, setRecording] = useState(false);
  const [previewParts, setPreviewParts] = useState<string[]>([]);
  const [conflict, setConflict] = useState(false);
  const previousValue = useRef(value);
  const fieldRef = useRef<HTMLDivElement>(null);
  const lastModifierRef = useRef<{ code: string; time: number } | null>(null);
  const hasModifiersHeldRef = useRef(false);
  const keyDownHandledRef = useRef(false);

  const stopRecording = useCallback((cancel: boolean) => {
    setRecording(false);
    setPreviewParts([]);
    hasModifiersHeldRef.current = false;
    window.voxApi.shortcuts.stopRecording();
    if (cancel) onChange(previousValue.current);
    window.voxApi.shortcuts.enable();
  }, [onChange]);

  const startRecording = useCallback(() => {
    previousValue.current = value;
    lastModifierRef.current = null;
    hasModifiersHeldRef.current = false;
    keyDownHandledRef.current = false;
    setRecording(true);
    setPreviewParts([]);
    window.voxApi.shortcuts.disable();
    window.voxApi.shortcuts.startRecording();
  }, [value]);

  useEffect(() => {
    if (!recording) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      slog.debug("Key pressed", {
        key: e.key, code: e.code, keyCode: e.keyCode, location: e.location,
        repeat: e.repeat, metaKey: e.metaKey, ctrlKey: e.ctrlKey,
        altKey: e.altKey, shiftKey: e.shiftKey,
      });

      if (e.code === "Escape") {
        stopRecording(true);
        return;
      }

      const modifiers: string[] = [];
      if (e.metaKey) modifiers.push("Command");
      if (e.ctrlKey) modifiers.push("Ctrl");
      if (e.altKey) modifiers.push("Alt");
      if (e.shiftKey) modifiers.push("Shift");

      hasModifiersHeldRef.current = modifiers.length > 0;

      const isFnDirect = e.key === "Fn" || e.code === "Fn" || e.keyCode === 63;
      const isFnBasedKey = e.code.startsWith("F") && parseInt(e.code.substring(1)) > 12;
      const isMediaKey = e.code.includes("Media") || e.code.includes("Audio") ||
                         e.code.includes("Brightness") || e.code.includes("Launch");

      if (isFnDirect) {
        modifiers.push("Fn");
        slog.debug("Fn key detected directly");
      }

      if (isFnBasedKey || isMediaKey) {
        slog.debug("Fn-based key detected");
      }

      if (isFnDirect) {
        setPreviewParts(modifiers);
        if (modifiers.length === 1 && modifiers[0] === "Fn") {
          slog.debug("Fn key alone pressed, waiting for main key");
        }
        return;
      }

      if (isModifierCode(e.code) && !isFnDirect) {
        if (e.repeat) {
          if (modifiers.length > 0) setPreviewParts(modifiers);
          return;
        }

        const now = Date.now();
        const last = lastModifierRef.current;

        if (last && last.code === e.code && now - last.time <= DOUBLE_TAP_THRESHOLD_MS) {
          // Double-tap detected — map code prefix to modifier name
          let modifier: string;
          if (e.code.startsWith("Meta")) modifier = "Command";
          else if (e.code.startsWith("Control")) modifier = "Ctrl";
          else if (e.code.startsWith("Alt")) modifier = "Alt";
          else if (e.code.startsWith("Shift")) modifier = "Shift";
          else {
            // Unknown modifier, ignore
            if (modifiers.length > 0) setPreviewParts(modifiers);
            return;
          }

          const accelerator = `${DOUBLE_TAP_PREFIX}${modifier}`;

          onChange(accelerator);
          setRecording(false);
          setPreviewParts([]);
          hasModifiersHeldRef.current = false;
          window.voxApi.shortcuts.stopRecording();
          window.voxApi.shortcuts.enable();
          lastModifierRef.current = null;
          return;
        }

        // First tap — record for potential double-tap
        lastModifierRef.current = { code: e.code, time: now };
        if (modifiers.length > 0) setPreviewParts(modifiers);
        return;
      }

      let mainKey = CODE_TO_KEY[e.code];

      if (!mainKey && e.key) {
        mainKey = CODE_TO_KEY[e.key] || e.key;
      }

      if (!mainKey) {
        slog.debug("Unknown key", { code: e.code, key: e.key });
        return;
      }

      slog.debug("Main key detected", mainKey);
      keyDownHandledRef.current = true;

      const accelerator = modifiers.length > 0
        ? [...modifiers, mainKey].join("+")
        : mainKey;

      if (accelerator === otherValue) {
        setConflict(true);
        setTimeout(() => setConflict(false), 600);
        return;
      }

      onChange(accelerator);
      setRecording(false);
      setPreviewParts([]);
      hasModifiersHeldRef.current = false;
      window.voxApi.shortcuts.stopRecording();
      window.voxApi.shortcuts.enable();
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (fieldRef.current && !fieldRef.current.contains(e.target as Node)) {
        stopRecording(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isModifierCode(e.code)) return;
      if (keyDownHandledRef.current) return;

      const modifiers: string[] = [];
      if (e.metaKey) modifiers.push("Command");
      if (e.ctrlKey) modifiers.push("Ctrl");
      if (e.altKey) modifiers.push("Alt");
      if (e.shiftKey) modifiers.push("Shift");
      if (modifiers.length === 0) return;

      let mainKey = CODE_TO_KEY[e.code];
      if (!mainKey && e.key) mainKey = CODE_TO_KEY[e.key] || e.key;
      if (!mainKey) return;

      const accelerator = [...modifiers, mainKey].join("+");
      slog.debug("Main key detected via keyup fallback", accelerator);

      if (accelerator === otherValue) {
        setConflict(true);
        setTimeout(() => setConflict(false), 600);
        return;
      }

      onChange(accelerator);
      setRecording(false);
      setPreviewParts([]);
      hasModifiersHeldRef.current = false;
      window.voxApi.shortcuts.enable();
    };

    const handleBlur = () => {
      if (hasModifiersHeldRef.current) return;
      stopRecording(true);
    };

    const handleElectronKey = (data: { code: string; key: string; alt: boolean; shift: boolean; control: boolean; meta: boolean }) => {
      if (keyDownHandledRef.current) return;

      if (isModifierCode(data.code)) return;

      const modifiers: string[] = [];
      if (data.meta) modifiers.push("Command");
      if (data.control) modifiers.push("Ctrl");
      if (data.alt) modifiers.push("Alt");
      if (data.shift) modifiers.push("Shift");
      if (modifiers.length === 0) return;

      let mainKey = CODE_TO_KEY[data.code];
      if (!mainKey) mainKey = CODE_TO_KEY[data.key] || data.key;
      if (!mainKey) return;

      const accelerator = [...modifiers, mainKey].join("+");
      slog.debug("Main key detected via before-input-event fallback", accelerator);

      if (accelerator === otherValue) {
        setConflict(true);
        setTimeout(() => setConflict(false), 600);
        return;
      }

      onChange(accelerator);
      setRecording(false);
      setPreviewParts([]);
      hasModifiersHeldRef.current = false;
      window.voxApi.shortcuts.stopRecording();
      window.voxApi.shortcuts.enable();
    };

    const removeElectronKeyListener = window.voxApi.shortcuts.onKey(handleElectronKey);

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("blur", handleBlur);

    return () => {
      removeElectronKeyListener();
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("blur", handleBlur);
    };
  }, [recording, otherValue, onChange, stopRecording]);

  const showingDoubleTap = !(recording && previewParts.length > 0) && isDoubleTap(value);
  const displayParts = recording && previewParts.length > 0
    ? previewParts
    : value
      ? isDoubleTap(value)
        ? [getDoubleTapModifier(value)!, getDoubleTapModifier(value)!]
        : parseAccelerator(value)
      : [];

  const fieldClasses = [
    styles.field,
    recording && styles.recording,
    conflict && styles.conflict,
    disabled && styles.disabled,
  ].filter(Boolean).join(" ");

  return (
    <div className={form.field}>
      <label>{label}</label>
      <div
        ref={fieldRef}
        onClick={() => !recording && !disabled && startRecording()}
        className={fieldClasses}
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
      >
        <span className={showingDoubleTap ? styles.doubleTapKeys : undefined}>
          {displayParts.map((part, i) => (
            <span key={i}>
              {/* eslint-disable-next-line i18next/no-literal-string */}
              {i > 0 && !showingDoubleTap && <span className={styles.separator}>+</span>}
              <kbd className={styles.kbd}>{PLATFORM_LABELS[part] || part}</kbd>
            </span>
          ))}
        </span>
        {!recording && !value && (
          <span className={styles.placeholder}>{t("shortcuts.notSet")}</span>
        )}
        {recording && previewParts.length === 0 && (
          <span className={styles.placeholder}>{t("shortcuts.pressShortcutOrDoubleTap")}</span>
        )}
      </div>
      <p className={form.hint}>{hint}</p>
    </div>
  );
}
