import { type LlmProvider } from "./llm/provider";
import { NoopProvider } from "./llm/noop";
import { type RecordingResult } from "./audio/recorder";
import { type TranscriptionResult } from "./audio/whisper";

export type PipelineStage = "transcribing" | "correcting";

export interface PipelineDeps {
  recorder: {
    start(): Promise<void>;
    stop(): Promise<RecordingResult>;
  };
  transcribe(
    audioBuffer: Float32Array,
    sampleRate: number,
    modelPath: string
  ): Promise<TranscriptionResult>;
  llmProvider: LlmProvider;
  modelPath: string;
  onStage?: (stage: PipelineStage) => void;
}

/**
 * Detect non-speech Whisper output caused by background noise.
 * Whisper hallucinates in two ways with noise:
 * 1. Repetitive characters/tokens (e.g. "ლლლლლლ")
 * 2. Sound descriptions in brackets/parens (e.g. "(drill whirring)", "[BLANK_AUDIO]")
 */
function isGarbageTranscription(text: string): boolean {
  if (text.length < 2) return false;

  // Strip bracketed/parenthesized sound descriptions that Whisper generates
  // for non-speech audio, e.g. "(machine whirring)", "[BLANK_AUDIO]", "*music*"
  const withoutDescriptions = text
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\*[^*]*\*/g, "")
    .trim();

  if (!withoutDescriptions) return true;

  // Count frequency of each character (ignoring spaces)
  const chars = withoutDescriptions.replace(/\s/g, "");
  if (chars.length === 0) return true;

  const freq = new Map<string, number>();
  for (const ch of chars) {
    freq.set(ch, (freq.get(ch) ?? 0) + 1);
  }

  // If a single character makes up >50% of the text, it's garbage
  const maxFreq = Math.max(...freq.values());
  if (maxFreq / chars.length > 0.5) return true;

  // Very low character diversity relative to length — real speech in any
  // language produces many distinct characters even in short sentences.
  // Whisper noise hallucinations repeat a tiny set of chars/glyphs.
  if (chars.length >= 10 && freq.size <= 2) return true;
  if (chars.length >= 20 && freq.size <= 6) return true;

  return false;
}

export class Pipeline {
  private readonly deps: PipelineDeps;

  constructor(deps: PipelineDeps) {
    this.deps = deps;
  }

  async startRecording(): Promise<void> {
    await this.deps.recorder.start();
  }

  async stopAndProcess(): Promise<string> {
    const recording = await this.deps.recorder.stop();

    this.deps.onStage?.("transcribing");
    const transcription = await this.deps.transcribe(
      recording.audioBuffer,
      recording.sampleRate,
      this.deps.modelPath
    );

    const rawText = transcription.text.trim();

    if (!rawText || isGarbageTranscription(rawText)) {
      return "";
    }

    // Skip LLM correction if using NoopProvider (Whisper-only mode)
    if (this.deps.llmProvider instanceof NoopProvider) {
      return rawText;
    }

    let finalText: string;
    try {
      this.deps.onStage?.("correcting");
      finalText = await this.deps.llmProvider.correct(rawText);
    } catch {
      // LLM failed — fall back to raw transcription
      finalText = rawText;
    }

    return finalText;
  }
}
