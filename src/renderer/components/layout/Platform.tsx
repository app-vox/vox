import type { ReactNode } from "react";
import type { VoxPlatform } from "../../../preload/index";
import { usePlatform } from "../../hooks/use-platform";

interface PlatformProps {
  only?: VoxPlatform | VoxPlatform[];
  not?: VoxPlatform | VoxPlatform[];
  children: ReactNode;
}

export function Platform({ only, not, children }: PlatformProps) {
  const platform = usePlatform();

  if (only) {
    const allowed = Array.isArray(only) ? only : [only];
    if (!allowed.includes(platform)) return null;
  }

  if (not) {
    const excluded = Array.isArray(not) ? not : [not];
    if (excluded.includes(platform)) return null;
  }

  return <>{children}</>;
}
