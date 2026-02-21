import { describe, it, expect, afterAll } from "vitest";
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

interface FailureRecord {
  id: string;
  expected: string;
  actual: string;
  rawSTT?: string;
  similarity: number;
  minSimilarity: number;
  failedAssertions: string[];
}

const failures: FailureRecord[] = [];

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

  afterAll(() => {
    if (failures.length === 0) return;

    const lines: string[] = [
      "",
      "┌──────────────────────────────────────────────────────────",
      `│  FAILURE SUMMARY — ${failures.length} failed scenario(s)`,
      "└──────────────────────────────────────────────────────────",
    ];

    for (const f of failures) {
      lines.push("");
      lines.push(`  ✗ ${f.id}`);
      if (f.rawSTT !== undefined) {
        lines.push(`    Raw STT:    ${f.rawSTT}`);
      }
      lines.push(`    Expected:   ${f.expected}`);
      lines.push(`    Actual:     ${f.actual}`);
      lines.push(
        `    Similarity: ${(f.similarity * 100).toFixed(1)}% (min: ${(f.minSimilarity * 100).toFixed(1)}%)`,
      );
      for (const msg of f.failedAssertions) {
        lines.push(`    ✗ ${msg}`);
      }
    }

    lines.push("");
    console.log(lines.join("\n"));
  });

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

            const similarityFailed =
              similarity < scenario.minSimilarity;

            if (similarityFailed || failedAssertions.length > 0) {
              failures.push({
                id: scenario.id,
                expected: scenario.expectedOutput,
                actual: result.correctedText,
                rawSTT: whisperAvailable
                  ? result.rawTranscription
                  : undefined,
                similarity,
                minSimilarity: scenario.minSimilarity,
                failedAssertions,
              });
            }

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
});
