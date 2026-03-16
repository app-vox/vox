import type { VoxPlatform } from "../../preload/index";

export function usePlatform(): VoxPlatform {
  return window.voxApi.platform;
}
