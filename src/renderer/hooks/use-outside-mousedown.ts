import { useEffect, type RefObject } from "react";

/** While `active`, calls `onOutside` when a mousedown lands outside the element `ref` points at. */
export function useOutsideMousedown(active: boolean, ref: RefObject<HTMLElement | null>, onOutside: () => void): void {
  useEffect(() => {
    if (!active) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [active, ref, onOutside]);
}
