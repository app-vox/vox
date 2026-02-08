import type { VoxAPI } from "../preload/index";

declare global {
  interface Window {
    voxApi: VoxAPI;
  }
}
