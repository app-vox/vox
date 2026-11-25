import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useOutsideMousedown } from "./use-outside-mousedown";

export interface InlineConfirm {
  /** True between the first click and the confirming second click. */
  confirming: boolean;
  /** Attach to the confirm button; a mousedown outside it cancels. */
  buttonRef: RefObject<HTMLButtonElement | null>;
  /** First click asks for confirmation, second click runs `onConfirm`. */
  handleClick: () => void;
  cancel: () => void;
}

/** Two-click inline confirmation that a click elsewhere or the timeout cancels. */
export function useInlineConfirm(onConfirm: () => void, timeoutMs = 3000): InlineConfirm {
  const [confirming, setConfirming] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const cancel = useCallback(() => {
    clearTimeout(timerRef.current);
    setConfirming(false);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  useOutsideMousedown(confirming, buttonRef, cancel);

  const handleClick = () => {
    if (confirming) {
      cancel();
      onConfirm();
    } else {
      setConfirming(true);
      timerRef.current = setTimeout(() => setConfirming(false), timeoutMs);
    }
  };

  return { confirming, buttonRef, handleClick, cancel };
}
