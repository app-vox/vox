import { useEffect } from "react";

export function applyPerformanceFlags(
  reduceAnimations: boolean,
  reduceVisualEffects: boolean,
) {
  const root = document.documentElement;
  if (reduceAnimations) {
    root.setAttribute("data-reduce-animations", "true");
  } else {
    root.removeAttribute("data-reduce-animations");
  }
  if (reduceVisualEffects) {
    root.setAttribute("data-reduce-effects", "true");
  } else {
    root.removeAttribute("data-reduce-effects");
  }
}

export function usePerformance(
  reduceAnimations: boolean | undefined,
  reduceVisualEffects: boolean | undefined,
) {
  useEffect(() => {
    applyPerformanceFlags(
      reduceAnimations ?? false,
      reduceVisualEffects ?? false,
    );
  }, [reduceAnimations, reduceVisualEffects]);
}
