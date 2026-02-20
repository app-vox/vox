import { vi } from "vitest";

// Mock Electron's app module so that src/main/audio/whisper.ts can be
// imported outside of an Electron environment. The module-scope call to
// app.getAppPath() resolves the whisper binary path — in tests we point
// it at the project root so it finds node_modules/whisper-node/...
vi.mock("electron", () => ({
  app: {
    getAppPath: vi.fn(() => process.cwd()),
  },
}));
