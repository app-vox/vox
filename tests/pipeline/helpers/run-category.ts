import { describe, it, expect, afterAll } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { Scenario } from "../scenarios/types";
import { loadPipelineTestConfig } from "./config";
import { normalizedSimilarity } from "./scoring";
import { runAssertions } from "./assertions";
import { runLlmCorrection, runFullPipeline } from "./pipeline-runner";
import { readWav } from "./wav-reader";

const SCENARIOS_DIR = join(__dirname, "..", "scenarios");
const AUDIO_DIR = join(__dirname, "..", "audio");

const config = loadPipelineTestConfig();
const whisperAvailable =
  !!config?.whisper?.modelPath && existsSync(config.whisper.modelPath);
const mode = whisperAvailable ? "full pipeline" : "LLM-only";

interface FailureRecord {
  id: string;
  expected: string;
  actual: string;
  rawSTT?: string;
  similarity: number;
  minSimilarity: number;
  failedAssertions: string[];
}

export function runCategory(category: string): void {
  const scenarioFile = join(SCENARIOS_DIR, `${category}.json`);
  const scenarios: Scenario[] = JSON.parse(
    readFileSync(scenarioFile, "utf-8"),
  );

  const failures: FailureRecord[] = [];

  describe.skipIf(!config)(category, () => {
    afterAll(() => {
      if (failures.length === 0) return;

      const lines: string[] = [
        "",
        `┌─ ${category}: ${failures.length} failed`,
        `└─ mode: ${mode}`,
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
