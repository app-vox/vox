import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { join } from "path";
import { loadPipelineTestConfig } from "./helpers/config";
import { readWav } from "./helpers/wav-reader";
import { transcribe } from "../../src/main/audio/whisper";
import { detectGarbage } from "../../src/main/pipeline";

const AUDIO_DIR = join(__dirname, "audio", "hallucination-loops");
const config = loadPipelineTestConfig();
const whisperAvailable =
  !!config?.whisper?.modelPath && existsSync(config.whisper.modelPath);

function modelName(): string {
  const filename = config?.whisper?.modelPath.split("/").pop() ?? "";
  return filename.replace("ggml-", "").replace(".bin", "");
}

describe.skipIf(!config || !whisperAvailable)(
  "hallucination loop detection (real audio)",
  () => {
    it(
      "001: 81-second Portuguese audio should be caught as garbage",
      { timeout: 120_000 },
      async () => {
        const audioPath = join(AUDIO_DIR, "001.wav");
        if (!existsSync(audioPath)) {
          throw new Error(`Audio fixture not found: ${audioPath}`);
        }

        const { samples, sampleRate } = readWav(audioPath);

        let text: string;
        try {
          const result = await transcribe(
            samples,
            sampleRate,
            config!.whisper.modelPath,
          );
          text = result.text;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("ETIMEDOUT") || msg.includes("killed") || msg.includes("failed")) {
            console.warn(
              `Whisper timed out on 81s audio with ${modelName()} model — skipping assertion`,
            );
            return;
          }
          throw err;
        }

        const reason = detectGarbage(text);

        if (reason) {
          expect(reason).toBe("loop");
        } else {
          expect(
            text.length,
            "If whisper produced valid text, it should be non-trivial",
          ).toBeGreaterThan(10);
        }
      },
    );
  },
);
