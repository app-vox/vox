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

// Mock electron-log to silence LLM provider logs (system prompts, request
// bodies, etc.). The providers import electron-log/main directly.
// electron-log overrides console methods, so configuring transport levels
// suppresses everything including our own test output. Mocking it entirely
// keeps console.log/warn working normally in test files.
const noop = vi.fn();
const noopScope = () => ({ error: noop, warn: noop, info: noop, verbose: noop, debug: noop, silly: noop });

vi.mock("electron-log/main", () => ({
  default: {
    scope: noopScope,
    error: noop,
    warn: noop,
    info: noop,
    verbose: noop,
    debug: noop,
    silly: noop,
    transports: { file: {}, console: {} },
    errorHandler: { startCatching: noop },
  },
}));
