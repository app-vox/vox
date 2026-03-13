import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { loadPipelineTestConfig } from "./helpers/config";
import { readWav } from "./helpers/wav-reader";
import { detectGarbage } from "../../src/main/pipeline";

const SCENARIOS_DIR = join(__dirname, "scenarios");
const AUDIO_DIR = join(__dirname, "audio");

const config = loadPipelineTestConfig();
const whisperAvailable =
  !!config?.whisper?.modelPath && existsSync(config.whisper.modelPath);

interface LoopScenario {
  id: string;
  description: string;
  spokenText: string;
  audioFile: string;
  expectedBehavior: string;
  notes: string;
}

const scenarios: LoopScenario[] = JSON.parse(
  readFileSync(join(SCENARIOS_DIR, "hallucination-loops.json"), "utf-8"),
);

describe("hallucination-loops", () => {
  describe("full pipeline — Whisper output should be caught by garbage detection", () => {
    for (const scenario of scenarios) {
      it.skipIf(!whisperAvailable)(
        `${scenario.id}: ${scenario.description}`,
        { timeout: 120_000 },
        async () => {
          const audioPath = join(AUDIO_DIR, scenario.audioFile);
          expect(existsSync(audioPath), `Audio file missing: ${audioPath}`).toBe(true);

          const { samples, sampleRate } = readWav(audioPath);
          const { transcribe } = await import("../../src/main/audio/whisper");

          const result = await transcribe(
            samples,
            sampleRate,
            config!.whisper.modelPath,
          );

          const reason = detectGarbage(result.text);

          expect(
            reason,
            `Expected garbage detection to catch Whisper output, but got null (text passed as clean).\n` +
            `Whisper output: "${result.text.slice(0, 200)}..."`,
          ).not.toBeNull();

          expect(
            reason,
            `Expected garbage reason "loop" but got "${reason}"`,
          ).toBe("loop");
        },
      );
    }
  });
});
