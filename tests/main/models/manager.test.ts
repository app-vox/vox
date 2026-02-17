import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { ModelManager } from "../../../src/main/models/manager";

describe("ModelManager", () => {
  let testDir: string;
  let manager: ModelManager;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "vox-models-"));
    manager = new ModelManager(testDir);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it("should report model as not downloaded when directory is empty", () => {
    expect(manager.isModelDownloaded("small")).toBe(false);
  });

  it("should report model as downloaded when file exists", () => {
    fs.writeFileSync(path.join(testDir, "ggml-small.bin"), "fake-model-data");
    expect(manager.isModelDownloaded("small")).toBe(true);
  });

  it("should return correct file path for a model", () => {
    const expected = path.join(testDir, "ggml-small.bin");
    expect(manager.getModelPath("small")).toBe(expected);
  });

  it("should list available model sizes", () => {
    const sizes = manager.getAvailableSizes();
    expect(sizes).toContain("tiny");
    expect(sizes).toContain("base");
    expect(sizes).toContain("small");
    expect(sizes).toContain("medium");
    expect(sizes).toContain("large");
  });

  it("should remove partial file when download is cancelled", async () => {
    const modelPath = manager.getModelPath("tiny");

    let readCount = 0;
    const mockBody = {
      getReader: () => ({
        read: () => {
          readCount++;
          if (readCount === 1) {
            return Promise.resolve({
              done: false,
              value: new Uint8Array([1, 2, 3]),
            } as ReadableStreamReadResult<Uint8Array>);
          }
          return Promise.reject(new DOMException("The operation was aborted.", "AbortError"));
        },
      }),
    } as unknown as ReadableStream<Uint8Array>;

    const mockResponse = {
      ok: true,
      headers: new Headers({ "content-length": "1000" }),
      body: mockBody,
    } as unknown as Response;

    vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse);

    await expect(manager.download("tiny")).rejects.toThrow();

    // The partial file should have been cleaned up
    expect(fs.existsSync(modelPath)).toBe(false);

    vi.restoreAllMocks();
  });

  it("should remove partial file when download fails due to network error", async () => {
    const modelPath = manager.getModelPath("tiny");

    const mockBody = {
      getReader: () => ({
        read: () => Promise.reject(new Error("Network failure")),
      }),
    } as unknown as ReadableStream<Uint8Array>;

    const mockResponse = {
      ok: true,
      headers: new Headers({ "content-length": "1000" }),
      body: mockBody,
    } as unknown as Response;

    vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse);

    await expect(manager.download("tiny")).rejects.toThrow("Network failure");

    expect(fs.existsSync(modelPath)).toBe(false);

    vi.restoreAllMocks();
  });

  it("should keep file on successful download", async () => {
    const modelPath = manager.getModelPath("tiny");

    let readCount = 0;
    const mockBody = {
      getReader: () => ({
        read: () => {
          readCount++;
          if (readCount === 1) {
            return Promise.resolve({
              done: false,
              value: new Uint8Array([1, 2, 3, 4]),
            } as ReadableStreamReadResult<Uint8Array>);
          }
          return Promise.resolve({ done: true, value: undefined } as ReadableStreamReadResult<Uint8Array>);
        },
      }),
    } as unknown as ReadableStream<Uint8Array>;

    const mockResponse = {
      ok: true,
      headers: new Headers({ "content-length": "4" }),
      body: mockBody,
    } as unknown as Response;

    vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse);

    const result = await manager.download("tiny");

    expect(result).toBe(modelPath);
    expect(fs.existsSync(modelPath)).toBe(true);

    vi.restoreAllMocks();
  });
});
