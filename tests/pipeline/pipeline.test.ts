import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import type { Scenario } from "./scenarios/types";
import { loadPipelineTestConfig } from "./helpers/config";
import { normalizedSimilarity } from "./helpers/scoring";
import { runAssertions } from "./helpers/assertions";
import { runLlmCorrection, runFullPipeline } from "./helpers/pipeline-runner";
import { readWav } from "./helpers/wav-reader";

const SCENARIOS_DIR = join(__dirname, "scenarios");
const AUDIO_DIR = join(__dirname, "audio");

const config = loadPipelineTestConfig();
const whisperAvailable =
  !!config?.whisper?.modelPath && existsSync(config.whisper.modelPath);

function loadAllScenarios(): { file: string; scenarios: Scenario[] }[] {
  const files = readdirSync(SCENARIOS_DIR).filter((f) => f.endsWith(".json"));
  return files.map((file) => {
    const content = readFileSync(join(SCENARIOS_DIR, file), "utf-8");
    return { file, scenarios: JSON.parse(content) as Scenario[] };
  });
}

describe.skipIf(!config)("pipeline integration tests", () => {
  const scenarioGroups = loadAllScenarios();
  const mode = whisperAvailable ? "full pipeline" : "LLM-only";

  console.log(`\nPipeline test mode: ${mode}`);
  if (!whisperAvailable) {
    console.log(
      "  Whisper model not configured — using spokenText as input (LLM-only mode).",
    );
    console.log(
      "  Set whisper.modelPath in your config to enable full pipeline tests.\n",
    );
  }

  for (const { file, scenarios } of scenarioGroups) {
    const category = file.replace(".json", "");

    describe(category, () => {
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
              // Default: full pipeline (audio → Whisper STT → LLM correction)
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
              // Fallback: LLM-only (spokenText → LLM correction)
              result = await runLlmCorrection(
                scenario.spokenText,
                config!,
                runnerOptions,
              );
            }

            console.log(`\n--- ${scenario.id} ---`);
            console.log(`  Mode:     ${mode}`);
            if (whisperAvailable) {
              console.log(`  Raw STT:  ${result.rawTranscription}`);
            }
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

            expect(
              similarity,
              `Similarity ${(similarity * 100).toFixed(1)}% is below minimum ${(scenario.minSimilarity * 100).toFixed(1)}% for ${scenario.id}`,
            ).toBeGreaterThanOrEqual(scenario.minSimilarity);

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
          },
        );
      }
    });
  }
});
