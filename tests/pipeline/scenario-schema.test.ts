import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import type { Scenario } from "./scenarios/types";
import { SCENARIO_CATEGORIES } from "./scenarios/types";

const SCENARIOS_DIR = join(__dirname, "scenarios");
const VALID_ASSERTION_TYPES = [
  "must_contain",
  "must_not_contain",
  "must_match_regex",
  "must_end_with",
];

function loadScenarioFile(filename: string): Scenario[] {
  const content = readFileSync(join(SCENARIOS_DIR, filename), "utf-8");
  return JSON.parse(content);
}

function getScenarioFiles(): string[] {
  return readdirSync(SCENARIOS_DIR).filter((f) => f.endsWith(".json"));
}

describe("scenario schema validation", () => {
  const files = getScenarioFiles();

  it("has at least one scenario file", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("every JSON file name matches a known category", () => {
    for (const file of files) {
      const category = file.replace(".json", "");
      expect(SCENARIO_CATEGORIES).toContain(category);
    }
  });

  it("all scenario IDs are globally unique", () => {
    const allIds = new Set<string>();
    for (const file of files) {
      const scenarios = loadScenarioFile(file);
      for (const s of scenarios) {
        expect(allIds.has(s.id), `Duplicate ID: ${s.id}`).toBe(false);
        allIds.add(s.id);
      }
    }
  });

  describe.each(files)("%s", (file) => {
    const scenarios = loadScenarioFile(file);
    const category = file.replace(".json", "");

    it("has 5-8 scenarios", () => {
      expect(scenarios.length).toBeGreaterThanOrEqual(5);
      expect(scenarios.length).toBeLessThanOrEqual(8);
    });

    it.each(scenarios.map((s) => [s.id, s]))("%s has valid structure", (_id, scenario) => {
      const s = scenario as Scenario;

      expect(s.id).toMatch(new RegExp(`^${category}-\\d{3}$`));
      expect(s.description.length).toBeGreaterThan(0);
      expect(s.spokenText.length).toBeGreaterThan(0);
      expect(s.audioFile).toMatch(new RegExp(`^${category}/\\d{3}\\.wav$`));
      expect(s.expectedOutput.length).toBeGreaterThan(0);
      expect(s.minSimilarity).toBeGreaterThanOrEqual(0);
      expect(s.minSimilarity).toBeLessThanOrEqual(1);

      expect(s.assertions.length).toBeGreaterThan(0);
      for (const a of s.assertions) {
        expect(VALID_ASSERTION_TYPES).toContain(a.type);
        expect(a.value.length).toBeGreaterThan(0);
      }

      if (category === "dictionary-terms") {
        expect(Array.isArray(s.dictionary)).toBe(true);
        expect(s.dictionary!.length).toBeGreaterThan(0);
      }
    });
  });
});
