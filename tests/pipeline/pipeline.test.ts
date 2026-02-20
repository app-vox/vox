import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import type { Scenario } from "./scenarios/types";
import { loadPipelineTestConfig } from "./helpers/config";
import { normalizedSimilarity } from "./helpers/scoring";
import { runAssertions } from "./helpers/assertions";
import { runLlmCorrection } from "./helpers/pipeline-runner";

const SCENARIOS_DIR = join(__dirname, "scenarios");

const config = loadPipelineTestConfig();

function loadAllScenarios(): { file: string; scenarios: Scenario[] }[] {
  const files = readdirSync(SCENARIOS_DIR).filter((f) => f.endsWith(".json"));
  return files.map((file) => {
    const content = readFileSync(join(SCENARIOS_DIR, file), "utf-8");
    return { file, scenarios: JSON.parse(content) as Scenario[] };
  });
}

describe.skipIf(!config)("pipeline integration tests", () => {
  const scenarioGroups = loadAllScenarios();

  for (const { file, scenarios } of scenarioGroups) {
    const category = file.replace(".json", "");

    describe(category, () => {
      for (const scenario of scenarios) {
        it(`${scenario.id}: ${scenario.description}`, { timeout: 30_000 }, async () => {
            const runnerOptions = {
              dictionary: scenario.dictionary,
            };

            const result = await runLlmCorrection(
              scenario.spokenText,
              config!,
              runnerOptions,
            );

            // Log details for debugging
            console.log(`\n--- ${scenario.id} ---`);
            console.log(`  Input:    ${scenario.spokenText}`);
            console.log(`  Expected: ${scenario.expectedOutput}`);
            console.log(`  Actual:   ${result.correctedText}`);

            const similarity = normalizedSimilarity(
              result.correctedText,
              scenario.expectedOutput,
            );
            console.log(
              `  Similarity: ${(similarity * 100).toFixed(1)}% (min: ${(scenario.minSimilarity * 100).toFixed(1)}%)`,
            );

            // Check similarity threshold
            expect(
              similarity,
              `Similarity ${(similarity * 100).toFixed(1)}% is below minimum ${(scenario.minSimilarity * 100).toFixed(1)}% for ${scenario.id}`,
            ).toBeGreaterThanOrEqual(scenario.minSimilarity);

            // Check all assertions
            const assertionResults = runAssertions(
              result.correctedText,
              scenario.assertions,
            );

            for (const ar of assertionResults) {
              console.log(
                `  [${ar.passed ? "PASS" : "FAIL"}] ${ar.message}`,
              );
            }

            for (const ar of assertionResults) {
              expect(ar.passed, ar.message).toBe(true);
            }
          });
      }
    });
  }
});
