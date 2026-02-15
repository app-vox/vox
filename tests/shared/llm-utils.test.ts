import { describe, it, expect } from "vitest";
import { migrateActiveTab } from "../../src/renderer/stores/config-store";

describe("migrateActiveTab", () => {
  it.each([
    ["appearance", "general"],
    ["history", "transcriptions"],
    ["general", "general"],
    ["whisper", "whisper"],
    [null, null],
  ] as const)("maps %j to %j", (input, expected) => {
    expect(migrateActiveTab(input)).toBe(expected);
  });
});
