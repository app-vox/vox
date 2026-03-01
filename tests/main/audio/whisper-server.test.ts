import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "events";

// Mock electron
vi.mock("electron", () => ({
  app: { getAppPath: () => "/mock/app" },
}));

// Mock electron-log
vi.mock("electron-log/main", () => ({
  default: {
    scope: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn(() => true),
  readFileSync: vi.fn(() => Buffer.from("fake-wav-data")),
}));

// Mock child_process
const mockProc = new EventEmitter() as EventEmitter & { kill: ReturnType<typeof vi.fn> };
mockProc.kill = vi.fn();
vi.mock("child_process", () => ({
  spawn: vi.fn(() => mockProc),
}));

// Mock net for findFreePort
vi.mock("net", () => {
  const mockServer = new EventEmitter();
  Object.assign(mockServer, {
    listen: vi.fn((_port: number, _host: string, cb: () => void) => {
      setTimeout(cb, 0);
    }),
    address: vi.fn(() => ({ port: 12345 })),
    close: vi.fn((cb: () => void) => cb()),
  });
  return {
    createServer: vi.fn(() => mockServer),
  };
});

// Mock http for probe and inference
let httpGetHandler: ((res: EventEmitter) => void) | null = null;
let httpRequestHandler: ((res: EventEmitter) => void) | null = null;

vi.mock("http", () => {
  const createMockReq = () => {
    const req = new EventEmitter() as EventEmitter & {
      write: ReturnType<typeof vi.fn>;
      end: ReturnType<typeof vi.fn>;
      destroy: ReturnType<typeof vi.fn>;
    };
    req.write = vi.fn();
    req.end = vi.fn();
    req.destroy = vi.fn();
    return req;
  };

  return {
    get: vi.fn((_opts: unknown, cb: (res: EventEmitter) => void) => {
      httpGetHandler = cb;
      const req = createMockReq();
      // Simulate successful probe after a tick
      setTimeout(() => {
        if (httpGetHandler) {
          const res = new EventEmitter() as EventEmitter & { resume: ReturnType<typeof vi.fn> };
          res.resume = vi.fn();
          httpGetHandler(res);
        }
      }, 0);
      return req;
    }),
    request: vi.fn((_opts: unknown, cb: (res: EventEmitter) => void) => {
      httpRequestHandler = cb;
      const req = createMockReq();
      return req;
    }),
  };
});

import { WhisperServer } from "../../../src/main/audio/whisper-server";
import { spawn } from "child_process";

describe("WhisperServer", () => {
  let server: WhisperServer;

  beforeEach(() => {
    vi.clearAllMocks();
    server = new WhisperServer();
    httpGetHandler = null;
    httpRequestHandler = null;
  });

  describe("start", () => {
    it("should spawn whisper-server.exe with correct arguments", async () => {
      const startPromise = server.start("/models/ggml-small.bin");

      // waitForReady polls; first probe succeeds
      await startPromise;

      expect(spawn).toHaveBeenCalledWith(
        expect.stringContaining("whisper-server.exe"),
        expect.arrayContaining([
          "--host", "127.0.0.1",
          "--port", "12345",
          "-m", "/models/ggml-small.bin",
          "--no-gpu",
        ]),
        expect.objectContaining({
          stdio: "ignore",
          windowsHide: true,
        })
      );
    });

    it("should set isReady to true after successful start", async () => {
      expect(server.isReady()).toBe(false);
      await server.start("/models/ggml-small.bin");
      expect(server.isReady()).toBe(true);
    });

    it("should not restart if same model is already running", async () => {
      await server.start("/models/ggml-small.bin");
      vi.mocked(spawn).mockClear();

      await server.start("/models/ggml-small.bin");
      expect(spawn).not.toHaveBeenCalled();
    });
  });

  describe("stop", () => {
    it("should kill the process on stop", async () => {
      await server.start("/models/ggml-small.bin");

      const stopPromise = server.stop();
      // Simulate process exit
      mockProc.emit("exit", 0, null);
      await stopPromise;

      expect(mockProc.kill).toHaveBeenCalledWith("SIGTERM");
      expect(server.isReady()).toBe(false);
    });

    it("should no-op when not running", async () => {
      await server.stop(); // Should not throw
    });
  });

  describe("transcribe", () => {
    it("should throw when server is not running", async () => {
      await expect(server.transcribe("/tmp/audio.wav", "en", "test")).rejects.toThrow(
        "whisper-server is not running"
      );
    });
  });
});
