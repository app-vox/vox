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
 * Common hallucinations that Whisper generates with silence or noise.
 * These are phrases Whisper "hears" when there's no actual speech.
 */
const COMMON_HALLUCINATIONS = [
  // English
  "thank you", "thanks for watching", "thank you for watching",
  "bye", "goodbye", "see you", "see you next time",
  "subscribe", "like and subscribe",
  // Short filler noise
  "you", "uh", "um", "hmm", "ah", "oh",
  // Common YouTube outro phrases
  "thanks", "bye bye",
];

/**
 * Detect non-speech Whisper output caused by background noise.
 * Whisper hallucinates in several ways with noise:
 * 1. Repetitive characters/tokens (e.g. "ლლლლლლ")
 * 2. Sound descriptions in brackets/parens (e.g. "(drill whirring)", "[BLANK_AUDIO]")
 * 3. Common phrases it "hears" in silence (e.g. "thank you", "bye")
 * 4. Very short transcriptions (likely noise, not speech)
 */
function isGarbageTranscription(text: string): boolean {
  const normalized = text.toLowerCase().trim();

  // Reject very short transcriptions (likely noise)
  if (normalized.length < 5) return true;

  // Check against common hallucinations
  if (COMMON_HALLUCINATIONS.includes(normalized)) {
    console.log(`[Vox] Rejected common Whisper hallucination: "${text}"`);
    return true;
  }

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

export class CanceledError extends Error {
  constructor() {
    super("Operation was canceled");
    this.name = "CanceledError";
  }
}

export class Pipeline {
  private readonly deps: PipelineDeps;
  private canceled = false;

  constructor(deps: PipelineDeps) {
    this.deps = deps;
  }

  cancel(): void {
    this.canceled = true;
  }

  async startRecording(): Promise<void> {
    this.canceled = false; // Reset cancel flag on new recording
    await this.deps.recorder.start();
  }

  async stopAndProcess(): Promise<string> {
    const processingStartTime = performance.now();
    const recording = await this.deps.recorder.stop();

    if (this.canceled) {
      throw new CanceledError();
    }

    this.deps.onStage?.("transcribing");
    const transcription = await this.deps.transcribe(
      recording.audioBuffer,
      recording.sampleRate,
      this.deps.modelPath
    );

    if (this.canceled) {
      throw new CanceledError();
    }

    const rawText = transcription.text.trim();
    console.log("[Vox] Whisper transcription:", rawText);

    // Skip garbage detection when LLM enhancement is disabled (Whisper-only mode)
    if (this.deps.llmProvider instanceof NoopProvider) {
      const processingTime = (performance.now() - processingStartTime).toFixed(1);
      console.log(`[Vox] LLM enhancement disabled (${processingTime}ms), returning raw transcription`);
      if (!rawText) return "";
      return rawText;
    }

    if (!rawText || isGarbageTranscription(rawText)) {
      console.log("[Vox] Transcription rejected as empty or garbage");
      return "";
    }

    if (this.canceled) {
      throw new CanceledError();
    }

    let finalText: string;
    try {
      this.deps.onStage?.("correcting");
      finalText = await this.deps.llmProvider.correct(rawText);
      console.log("[Vox] LLM corrected text:", finalText);
    } catch (err: unknown) {
      // LLM failed — fall back to raw transcription
      console.log("[Vox] LLM correction failed, using raw transcription:", err instanceof Error ? err.message : err);
      finalText = rawText;
    }

    if (this.canceled) {
      throw new CanceledError();
    }

    const totalTime = (performance.now() - processingStartTime).toFixed(1);
    console.log(`[Vox] Total processing time: ${totalTime}ms`);

    return finalText;
  }
}
