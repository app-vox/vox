import { describe, it, expect, beforeEach, vi } from "vitest";
import { SetupChecker } from "../../../src/main/setup/checker";
import { ModelManager } from "../../../src/main/models/manager";

vi.mock("../../../src/main/models/manager");

describe("SetupChecker", () => {
  let modelManager: ModelManager;
  let checker: SetupChecker;

  beforeEach(() => {
    modelManager = new ModelManager("/fake/path");
    checker = new SetupChecker(modelManager);
  });

  it("should detect when no models are downloaded", () => {
    vi.spyOn(modelManager, "getAvailableSizes").mockReturnValue(["tiny", "base", "small"]);
    vi.spyOn(modelManager, "isModelDownloaded").mockReturnValue(false);

    const result = checker.hasAnyModel();

    expect(result).toBe(false);
  });

  it("should detect when at least one model is downloaded", () => {
    vi.spyOn(modelManager, "getAvailableSizes").mockReturnValue(["tiny", "base", "small"]);
    vi.spyOn(modelManager, "isModelDownloaded")
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    const result = checker.hasAnyModel();

    expect(result).toBe(true);
  });

  it("should return list of downloaded model sizes", () => {
    vi.spyOn(modelManager, "getAvailableSizes").mockReturnValue(["tiny", "base", "small"]);
    vi.spyOn(modelManager, "isModelDownloaded")
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true);

    const result = checker.getDownloadedModels();

    expect(result).toEqual(["base", "small"]);
  });
});
