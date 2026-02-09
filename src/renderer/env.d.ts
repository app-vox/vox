import type { VoxAPI } from "../preload/index";

declare global {
  interface Window {
    voxApi: VoxAPI;
  }

  interface ImportMeta {
    env: {
      DEV: boolean;
      MODE: string;
      PROD: boolean;
      SSR: boolean;
    };
  }
}
