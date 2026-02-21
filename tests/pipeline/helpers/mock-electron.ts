import { vi } from "vitest";
import log from "electron-log/main";

// Mock Electron's app module so that src/main/audio/whisper.ts can be
// imported outside of an Electron environment. The module-scope call to
// app.getAppPath() resolves the whisper binary path — in tests we point
// it at the project root so it finds node_modules/whisper-node/...
vi.mock("electron", () => ({
  app: {
    getAppPath: vi.fn(() => process.cwd()),
  },
}));

// Suppress verbose LLM provider logs (system prompts, request bodies).
// The providers import electron-log/main directly, not src/main/logger.ts,
// so VOX_LOG_LEVEL has no effect — set the level on the instance instead.
log.transports.console.level = "warn";
log.transports.file.level = false;
