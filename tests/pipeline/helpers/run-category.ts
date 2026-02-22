import { describe, it, expect, afterAll } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { Scenario } from "../scenarios/types";
import { loadPipelineTestConfig } from "./config";
import { normalizedSimilarity } from "./scoring";
import { runAssertions } from "./assertions";
import { runLlmCorrection, runFullPipeline } from "./pipeline-runner";
import { readWav } from "./wav-reader";
import {
  writeCategoryResult,
  type ScenarioResult,
} from "./results-store";

const SCENARIOS_DIR = join(__dirname, "..", "scenarios");
const AUDIO_DIR = join(__dirname, "..", "audio");

const config = loadPipelineTestConfig();
const whisperAvailable =
  !!config?.whisper?.modelPath && existsSync(config.whisper.modelPath);
const mode = whisperAvailable ? "full pipeline" : "LLM-only";

export function runCategory(category: string): void {
  const scenarioFile = join(SCENARIOS_DIR, `${category}.json`);
  const scenarios: Scenario[] = JSON.parse(
    readFileSync(scenarioFile, "utf-8"),
  );

  const results: ScenarioResult[] = [];

  describe.skipIf(!config)(category, () => {
    afterAll(() => {
      writeCategoryResult({
        category,
        mode,
        timestamp: new Date().toISOString(),
        results,
      });
    });

    for (const scenario of scenarios) {
      it(
        `${scenario.id}: ${scenario.description}`,
        { timeout: 60_000 },
        async () => {
          const runnerOptions = {
            dictionary: scenario.dictionary,
          };

          let result;

          if (whisperAvailable) {
            const audioPath = join(AUDIO_DIR, scenario.audioFile);
            if (!existsSync(audioPath)) {
              throw new Error(
                `Audio file not found: ${audioPath}. Run scripts/generate-pipeline-audio.sh to generate.`,
              );
            }

            const { samples, sampleRate } = readWav(audioPath);
            result = await runFullPipeline(
              samples,
              sampleRate,
              config!,
              runnerOptions,
            );
          } else {
            result = await runLlmCorrection(
              scenario.spokenText,
              config!,
              runnerOptions,
            );
          }

          const similarity = normalizedSimilarity(
            result.correctedText,
            scenario.expectedOutput,
          );

          const assertionResults = runAssertions(
            result.correctedText,
            scenario.assertions,
          );

          const failedAssertions = assertionResults
            .filter((ar) => !ar.passed)
            .map((ar) => ar.message);

          const similarityFailed = similarity < scenario.minSimilarity;
          const passed = !similarityFailed && failedAssertions.length === 0;

          results.push({
            id: scenario.id,
            description: scenario.description,
            passed,
            expected: scenario.expectedOutput,
            actual: result.correctedText,
            rawSTT: whisperAvailable ? result.rawTranscription : undefined,
            similarity,
            minSimilarity: scenario.minSimilarity,
            failedAssertions,
          });

          expect(
            similarity,
            `Similarity ${(similarity * 100).toFixed(1)}% is below minimum ${(scenario.minSimilarity * 100).toFixed(1)}% for ${scenario.id}`,
          ).toBeGreaterThanOrEqual(scenario.minSimilarity);

          for (const ar of assertionResults) {
            expect(ar.passed, ar.message).toBe(true);
          }
        },
      );
    }
  });
}
