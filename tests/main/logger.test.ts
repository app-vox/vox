import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Store references to the mock transport objects and errorHandler
const mockFileTransport = { level: false as string | false, maxSize: 0 };
const mockConsoleTransport = { level: false as string | false };
const mockErrorHandler = { startCatching: vi.fn() };

vi.mock("electron-log/main", () => {
  return {
    default: {
      transports: {
        file: mockFileTransport,
        console: mockConsoleTransport,
      },
      errorHandler: mockErrorHandler,
    },
  };
});

describe("logger", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    mockFileTransport.level = false;
    mockFileTransport.maxSize = 0;
    mockConsoleTransport.level = false;
    mockErrorHandler.startCatching.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should set file transport maxSize to 10MB", async () => {
    const { default: log } = await import("../../src/main/logger");
    expect(log.transports.file.maxSize).toBe(10 * 1024 * 1024);
  });

  it("should default to debug level for both transports in development", async () => {
    delete process.env.VOX_LOG_LEVEL;
    process.env.NODE_ENV = "development";

    const { default: log } = await import("../../src/main/logger");
    expect(log.transports.file.level).toBe("debug");
    expect(log.transports.console.level).toBe("debug");
  });

  it("should default to info file level and warn console level in production", async () => {
    delete process.env.VOX_LOG_LEVEL;
    process.env.NODE_ENV = "production";

    const { default: log } = await import("../../src/main/logger");
    expect(log.transports.file.level).toBe("info");
    expect(log.transports.console.level).toBe("warn");
  });

  it("should respect VOX_LOG_LEVEL env var override", async () => {
    process.env.VOX_LOG_LEVEL = "verbose";

    const { default: log } = await import("../../src/main/logger");
    expect(log.transports.file.level).toBe("verbose");
    expect(log.transports.console.level).toBe("verbose");
  });

  it("should ignore invalid VOX_LOG_LEVEL and use defaults", async () => {
    process.env.VOX_LOG_LEVEL = "banana";
    process.env.NODE_ENV = "production";

    const { default: log } = await import("../../src/main/logger");
    expect(log.transports.file.level).toBe("info");
    expect(log.transports.console.level).toBe("warn");
  });

  it("should enable error handler (startCatching called)", async () => {
    await import("../../src/main/logger");
    expect(mockErrorHandler.startCatching).toHaveBeenCalled();
  });
});
