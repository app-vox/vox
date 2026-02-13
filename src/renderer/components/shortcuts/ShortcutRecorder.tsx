import { useState, useRef, useCallback, useEffect } from "react";
import { useT } from "../../i18n-context";
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
}

export function ShortcutRecorder({ label, hint, value, otherValue, onChange }: ShortcutRecorderProps) {
  const t = useT();
  const [recording, setRecording] = useState(false);
  const [previewParts, setPreviewParts] = useState<string[]>([]);
  const [conflict, setConflict] = useState(false);
  const previousValue = useRef(value);
  const fieldRef = useRef<HTMLDivElement>(null);

  const stopRecording = useCallback((cancel: boolean) => {
    setRecording(false);
    setPreviewParts([]);
    if (cancel) onChange(previousValue.current);
    window.voxApi.shortcuts.enable();
  }, [onChange]);

  const startRecording = useCallback(() => {
    previousValue.current = value;
    setRecording(true);
    setPreviewParts([]);
    window.voxApi.shortcuts.disable();
  }, [value]);

  useEffect(() => {
    if (!recording) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      console.log("=".repeat(80));
      console.log("[ShortcutRecorder] KEY PRESSED - COMPLETE EVENT DETAILS:");
      console.log("  e.key:", e.key);
      console.log("  e.code:", e.code);
      console.log("  e.keyCode:", e.keyCode);
      console.log("  e.which:", e.which);
      console.log("  e.location:", e.location);
      console.log("  e.repeat:", e.repeat);
      console.log("  Modifiers:");
      console.log("    metaKey (Command):", e.metaKey);
      console.log("    ctrlKey:", e.ctrlKey);
      console.log("    altKey (Option):", e.altKey);
      console.log("    shiftKey:", e.shiftKey);
      console.log("  Event type:", e.type);
      console.log("  Timestamp:", e.timeStamp);
      console.log("=".repeat(80));

      if (e.code === "Escape") {
        stopRecording(true);
        return;
      }

      const modifiers: string[] = [];
      if (e.metaKey) modifiers.push("Command");
      if (e.ctrlKey) modifiers.push("Ctrl");
      if (e.altKey) modifiers.push("Alt");
      if (e.shiftKey) modifiers.push("Shift");

      const isFnDirect = e.key === "Fn" || e.code === "Fn" || e.keyCode === 63;
      const isFnBasedKey = e.code.startsWith("F") && parseInt(e.code.substring(1)) > 12;
      const isMediaKey = e.code.includes("Media") || e.code.includes("Audio") ||
                         e.code.includes("Brightness") || e.code.includes("Launch");

      if (isFnDirect) {
        modifiers.push("Fn");
        console.log("[ShortcutRecorder] ✓ Fn key detected directly!");
      }

      if (isFnBasedKey || isMediaKey) {
        console.log("[ShortcutRecorder] ✓ Fn-based key detected (F13-F24 or media key)");
      }

      if (isFnDirect) {
        setPreviewParts(modifiers);
        if (modifiers.length === 1 && modifiers[0] === "Fn") {
          console.log("[ShortcutRecorder] Fn key alone pressed - waiting for main key");
        }
        return;
      }

      if (isModifierCode(e.code)) {
        if (modifiers.length > 0) setPreviewParts(modifiers);
        return;
      }

      let mainKey = CODE_TO_KEY[e.code];

      if (!mainKey && e.key) {
        mainKey = CODE_TO_KEY[e.key] || e.key;
      }

      if (!mainKey) {
        console.log("[ShortcutRecorder] ❌ Unknown key, cannot record");
        console.log("[ShortcutRecorder] Tried e.code:", e.code, "and e.key:", e.key);
        return;
      }

      console.log("[ShortcutRecorder] ✓ Main key detected:", mainKey);

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
      window.voxApi.shortcuts.enable();
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (fieldRef.current && !fieldRef.current.contains(e.target as Node)) {
        stopRecording(true);
      }
    };

    const handleBlur = () => stopRecording(true);

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("blur", handleBlur);
    };
  }, [recording, otherValue, onChange, stopRecording]);

  const displayParts = recording && previewParts.length > 0
    ? previewParts
    : parseAccelerator(value);

  const fieldClasses = [
    styles.field,
    recording && styles.recording,
    conflict && styles.conflict,
  ].filter(Boolean).join(" ");

  return (
    <div className={form.field}>
      <label>{label}</label>
      <div
        ref={fieldRef}
        onClick={() => !recording && startRecording()}
        className={fieldClasses}
        tabIndex={0}
      >
        <span>
          {displayParts.map((part, i) => (
            <span key={i}>
              {i > 0 && <span className={styles.separator}>+</span>}
              <kbd className={styles.kbd}>{PLATFORM_LABELS[part] || part}</kbd>
            </span>
          ))}
        </span>
        {recording && previewParts.length === 0 && (
          <span className={styles.placeholder}>{t("shortcuts.pressShortcut")}</span>
        )}
      </div>
      <p className={form.hint}>{hint}</p>
    </div>
  );
}
