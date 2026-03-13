import { type LlmProvider } from "./llm/provider";
import { NoopProvider } from "./llm/noop";
import { type RecordingResult } from "./audio/recorder";
import { type TranscriptionResult } from "./audio/whisper";
import { existsSync } from "fs";
import { t } from "../shared/i18n";
import log from "electron-log/main";

const slog = log.scope("Pipeline");

const GARBAGE_AUDIO_THRESHOLD_MS = 5000;
const LOOP_RETRY_TEMPERATURES = [0.4, 0.8];

export type PipelineStage = "transcribing" | "enhancing";

export type GarbageReason = "short" | "hallucination" | "description" | "char-frequency" | "char-diversity" | "loop";

export interface PipelineDeps {
  recorder: {
    start(): Promise<void>;
    stop(): Promise<RecordingResult>;
    cancel(): Promise<void>;
    playAudioCue?(samples: number[], sampleRate?: number): Promise<void>;
  };
  transcribe(
    audioBuffer: Float32Array,
    sampleRate: number,
    modelPath: string,
    dictionary?: string[],
    speechLanguages?: string[],
    temperature?: number
  ): Promise<TranscriptionResult>;
  llmProvider: LlmProvider;
  modelPath: string;
  dictionary?: string[];
  speechLanguages?: string[];
  hasCustomPrompt?: boolean;
  llmModelName?: string;
  analytics?: {
    track(event: string, properties?: Record<string, unknown>): void;
  };
  onStage?: (stage: PipelineStage) => void;
  onComplete?: (result: {
    text: string;
    originalText: string;
    audioDurationMs: number;
    recording: RecordingResult;
    llmFailed?: boolean;
    errorMessage?: string;
  }) => void;
  onLlmFailed?: () => void;
  onFailure?: (result: {
    failedStep: "whisper" | "garbage";
    error: Error;
    recording: RecordingResult;
    audioDurationMs: number;
  }) => void;
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
  // Well-known whisper.cpp silence hallucinations
  "thank you so much", "thank you very much",
  "thanks for listening", "thanks for watching this video",
  "please subscribe", "please like and subscribe",
  "i'll see you in the next video", "see you in the next one",
  "i hope you enjoyed", "i hope you enjoyed this video",
  "the end", "...",
  // Whisper.cpp noise artifacts
  "so", "okay", "ok", "yeah", "yes", "no", "right",
  "well", "like", "just", "actually",
  // Chinese/Japanese common hallucinations
  "\u5b57\u5e55\u7f51", "\u5b57\u5e55\u7ec4", "\u5b57\u5e55\u7531",
  "\u00e0 bient\u00f4t", "merci",
  // Subtitle watermarks
  "amara.org", "subtitles by",
  "subtitles by the amara.org community",
  "copyright", "all rights reserved",
];

/**
 * Detect non-speech Whisper output caused by background noise.
 * Returns a reason string if garbage, or null if the text looks legitimate.
 *
 * Whisper hallucinates in several ways with noise:
 * 1. Repetitive characters/tokens (e.g. "ლლლლლლ")
 * 2. Sound descriptions in brackets/parens (e.g. "(drill whirring)", "[BLANK_AUDIO]")
 * 3. Common phrases it "hears" in silence (e.g. "thank you", "bye")
 * 4. Very short transcriptions (likely noise, not speech)
 * 5. Hallucination loops — the same sentence or phrase repeated many times
 */
export function detectGarbage(text: string): GarbageReason | null {
  const normalized = text.toLowerCase().trim();

  if (normalized.length < 5) return "short";

  if (COMMON_HALLUCINATIONS.includes(normalized)) {
    slog.info("Rejected Whisper hallucination", text);
    return "hallucination";
  }

  const withoutDescriptions = text
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\*[^*]*\*/g, "")
    .trim();

  if (!withoutDescriptions) return "description";

  const chars = withoutDescriptions.replace(/\s/g, "");
  if (chars.length === 0) return "description";

  const freq = new Map<string, number>();
  for (const ch of chars) {
    freq.set(ch, (freq.get(ch) ?? 0) + 1);
  }

  const maxFreq = Math.max(...freq.values());
  if (maxFreq / chars.length > 0.5) return "char-frequency";

  if (chars.length >= 10 && freq.size <= 2) return "char-diversity";
  if (chars.length >= 20 && freq.size <= 6) return "char-diversity";

  if (hasRepetitivePattern(normalized)) return "loop";

  return null;
}

const MIN_SENTENCE_REPEATS = 3;
const MIN_NGRAM_SIZE = 3;
const NGRAM_DOMINANCE_RATIO = 0.5;

function hasRepetitivePattern(text: string): boolean {
  // Layer 1: Sentence-level repetition detection
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sentences.length >= MIN_SENTENCE_REPEATS) {
    const sentenceFreq = new Map<string, number>();
    for (const s of sentences) {
      sentenceFreq.set(s, (sentenceFreq.get(s) ?? 0) + 1);
    }

    const maxRepeats = Math.max(...sentenceFreq.values());
    if (maxRepeats >= MIN_SENTENCE_REPEATS && maxRepeats / sentences.length >= NGRAM_DOMINANCE_RATIO) {
      slog.info("Rejected hallucination loop (sentence repetition)", {
        repeats: maxRepeats, total: sentences.length,
      });
      return true;
    }
  }

  // Layer 2: N-gram repetition detection
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length < MIN_NGRAM_SIZE * MIN_SENTENCE_REPEATS) return false;

  for (const n of [MIN_NGRAM_SIZE, 4, 5]) {
    if (words.length < n * MIN_SENTENCE_REPEATS) continue;
    const ngramFreq = new Map<string, number>();
    for (let i = 0; i <= words.length - n; i++) {
      const ngram = words.slice(i, i + n).join(" ");
      ngramFreq.set(ngram, (ngramFreq.get(ngram) ?? 0) + 1);
    }

    const totalNgrams = words.length - n + 1;
    const uniqueNgrams = ngramFreq.size;
    const maxNgramRepeats = Math.max(...ngramFreq.values());

    if (
      totalNgrams >= MIN_NGRAM_SIZE * MIN_SENTENCE_REPEATS &&
      maxNgramRepeats >= MIN_SENTENCE_REPEATS &&
      uniqueNgrams / totalNgrams <= 0.2
    ) {
      slog.info("Rejected hallucination loop (n-gram repetition)", {
        n, unique: uniqueNgrams, total: totalNgrams, maxRepeats: maxNgramRepeats,
      });
      return true;
    }
  }

  return false;
}

export class CanceledError extends Error {
  constructor() {
    super("Operation was canceled");
    this.name = "CanceledError";
  }
}

export class NoModelError extends Error {
  constructor() {
    super(t("error.noModel"));
    this.name = "NoModelError";
  }
}

export class Pipeline {
  private readonly deps: PipelineDeps;
  private canceled = false;
  private generation = 0;
  private currentStage: PipelineStage | "listening" | null = null;
  private cancelingStage: PipelineStage | "listening" | null = null;
  private heldRecording: RecordingResult | null = null;
  private heldTranscription: string | null = null;

  private get whisperModelName(): string {
    return this.deps.modelPath.split("/").pop()?.replace("ggml-", "").replace(".bin", "") ?? "unknown";
  }

  constructor(deps: PipelineDeps) {
    this.deps = deps;
    if (!existsSync(deps.modelPath)) {
      slog.warn("Model path does not exist", deps.modelPath);
    }
  }

  async cancel(): Promise<void> {
    this.canceled = true;
    try {
      await this.deps.recorder.cancel();
    } catch (err) {
      slog.error("Error canceling recorder", err);
    }
  }

  async playAudioCue(samples: number[], sampleRate?: number): Promise<void> {
    await this.deps.recorder.playAudioCue?.(samples, sampleRate);
  }

  async startRecording(): Promise<void> {
    if (!existsSync(this.deps.modelPath)) {
      throw new NoModelError();
    }
    this.canceled = false;
    this.cancelingStage = null;
    this.heldRecording = null;
    this.heldTranscription = null;
    this.currentStage = "listening";
    this.generation++;
    await this.deps.recorder.start();
  }

  async stopAndProcess(): Promise<string> {
    const gen = this.generation;
    const recording = await this.deps.recorder.stop();
    this.heldRecording = recording;

    if (this.canceled || gen !== this.generation) {
      throw new CanceledError();
    }

    return this.processFromRecording(recording, gen);
  }

  gracefulCancel(): { stage: PipelineStage | "listening" } {
    const stage = this.currentStage ?? "listening";
    this.cancelingStage = stage;
    this.canceled = true;

    if (stage === "listening") {
      this.deps.recorder.stop().then((recording) => {
        this.heldRecording = recording;
      }).catch(() => {
        // If stop fails (already stopped), heldRecording may already be set
      });
    }

    return { stage };
  }

  async undoCancel(): Promise<string> {
    if (!this.cancelingStage) throw new Error("Not in canceling state");

    const stage = this.cancelingStage;
    this.cancelingStage = null;
    this.canceled = false;
    this.generation++;
    const gen = this.generation;

    if (stage === "enhancing" && this.heldTranscription) {
      return this.processFromTranscription(this.heldTranscription, this.heldRecording!, gen);
    }

    return this.processFromRecording(this.heldRecording!, gen);
  }

  async retryFromRecording(recording: RecordingResult): Promise<string> {
    if (!existsSync(this.deps.modelPath)) {
      throw new NoModelError();
    }
    this.canceled = false;
    this.cancelingStage = null;
    this.heldRecording = recording;
    this.heldTranscription = null;
    this.currentStage = null;
    this.generation++;
    const gen = this.generation;

    return this.processFromRecording(recording, gen);
  }

  confirmCancel(): void {
    this.cancelingStage = null;
    this.heldRecording = null;
    this.heldTranscription = null;
    this.currentStage = null;
    this.canceled = true;
  }

  isCanceling(): boolean {
    return this.cancelingStage !== null;
  }

  private async runTranscription(
    recording: RecordingResult,
    gen: number,
    temperature?: number,
  ): Promise<TranscriptionResult> {
    const transcription = await this.deps.transcribe(
      recording.audioBuffer,
      recording.sampleRate,
      this.deps.modelPath,
      this.deps.dictionary ?? [],
      this.deps.speechLanguages ?? [],
      temperature
    );

    if (this.canceled || gen !== this.generation) {
      throw new CanceledError();
    }

    return transcription;
  }

  private async processFromRecording(
    recording: RecordingResult,
    gen: number
  ): Promise<string> {
    const processingStartTime = performance.now();

    slog.info("Starting transcription pipeline");
    this.deps.analytics?.track("transcription_started", {
      whisper_model: this.whisperModelName,
    });
    slog.debug("Audio details", {
      bufferLength: recording.audioBuffer.length,
      sampleRate: recording.sampleRate,
    });

    this.currentStage = "transcribing";
    this.deps.onStage?.("transcribing");
    let transcription: TranscriptionResult;
    try {
      transcription = await this.runTranscription(recording, gen);
    } catch (err: unknown) {
      if (err instanceof CanceledError) throw err;
      this.deps.analytics?.track("transcription_failed", {
        whisper_model: this.whisperModelName,
        error_type: err instanceof Error ? err.name : "unknown",
      });
      const audioDurationMs = Math.round((recording.audioBuffer.length / recording.sampleRate) * 1000);
      this.deps.onFailure?.({
        failedStep: "whisper",
        error: err instanceof Error ? err : new Error(String(err)),
        recording,
        audioDurationMs,
      });
      throw err;
    }

    const rawText = transcription.text.trim();
    this.heldTranscription = rawText;
    const audioDurationMs = Math.round((recording.audioBuffer.length / recording.sampleRate) * 1000);
    this.deps.analytics?.track("transcription_completed", {
      whisper_model: this.whisperModelName,
      duration_ms: Number((performance.now() - processingStartTime).toFixed(1)),
      word_count: rawText.split(/\s+/).filter(Boolean).length,
      audio_duration_ms: audioDurationMs,
    });
    slog.info("Whisper transcription", rawText);
    slog.debug("Transcription details", {
      rawTextLength: rawText.length,
      llmProviderType: this.deps.llmProvider.constructor.name,
    });

    // Skip garbage detection when LLM enhancement is disabled (Whisper-only mode)
    if (this.deps.llmProvider instanceof NoopProvider) {
      const processingTimeMs = Number((performance.now() - processingStartTime).toFixed(1));
      slog.info("LLM enhancement disabled", { processingTimeMs });
      this.deps.analytics?.track("llm_enhancement_skipped");
      if (!rawText) return "";
      this.currentStage = null;
      this.deps.onComplete?.({ text: rawText, originalText: rawText, audioDurationMs, recording });
      return rawText;
    }

    slog.info("Checking for garbage transcription");
    const garbageReason = rawText ? detectGarbage(rawText) : "short";

    if (garbageReason) {
      // For hallucination loops, retry with increasing temperature to break the loop
      if (garbageReason === "loop") {
        const retried = await this.retryWithTemperature(recording, gen);
        if (retried !== null) {
          return this.processFromTranscription(retried, recording, gen);
        }
      }

      slog.info("Transcription rejected as garbage", { reason: garbageReason });
      this.deps.analytics?.track("transcription_garbage_detected", {
        whisper_model: this.whisperModelName,
        reason: garbageReason,
      });
      if (audioDurationMs > GARBAGE_AUDIO_THRESHOLD_MS) {
        this.deps.onFailure?.({
          failedStep: "garbage",
          error: new Error("No speech detected"),
          recording,
          audioDurationMs,
        });
      }
      return "";
    }
    slog.info("Transcription passed, sending to LLM");

    if (this.canceled || gen !== this.generation) {
      throw new CanceledError();
    }

    return this.processFromTranscription(rawText, recording, gen);
  }

  private async retryWithTemperature(
    recording: RecordingResult,
    gen: number,
  ): Promise<string | null> {
    for (let i = 0; i < LOOP_RETRY_TEMPERATURES.length; i++) {
      const temp = LOOP_RETRY_TEMPERATURES[i];
      const attempt = i + 2;
      slog.info("Retrying transcription with higher temperature to break hallucination loop", {
        attempt, temperature: temp,
      });
      this.deps.analytics?.track("transcription_loop_retry", {
        whisper_model: this.whisperModelName,
        attempt,
        temperature: temp,
      });

      try {
        const retryResult = await this.runTranscription(recording, gen, temp);
        const retryText = retryResult.text.trim();

        if (!retryText) continue;
        const retryReason = detectGarbage(retryText);

        if (!retryReason) {
          slog.info("Retry succeeded", { attempt, temperature: temp });
          this.deps.analytics?.track("transcription_loop_retry_succeeded", {
            attempt, temperature: temp,
          });
          this.heldTranscription = retryText;
          return retryText;
        }

        slog.info("Retry still garbage", { attempt, temperature: temp, reason: retryReason });
      } catch (err: unknown) {
        if (err instanceof CanceledError) throw err;
        slog.warn("Retry transcription failed", { attempt, error: err instanceof Error ? err.message : err });
      }
    }

    slog.info("All retry attempts failed, giving up");
    return null;
  }

  private async processFromTranscription(
    rawText: string,
    recording: RecordingResult,
    gen: number
  ): Promise<string> {
    const processingStartTime = performance.now();
    const audioDurationMs = Math.round((recording.audioBuffer.length / recording.sampleRate) * 1000);

    if (this.deps.dictionary && this.deps.dictionary.length > 0) {
      this.deps.analytics?.track("dictionary_used", {
        term_count: this.deps.dictionary.length,
      });
    }

    if (this.deps.hasCustomPrompt) {
      this.deps.analytics?.track("custom_prompt_used");
    }

    if (this.deps.speechLanguages && this.deps.speechLanguages.length > 0) {
      this.deps.analytics?.track("speech_languages_used", {
        language_count: this.deps.speechLanguages.length,
        languages: this.deps.speechLanguages.join(","),
      });
    }

    const llmStartTime = performance.now();
    const llmProviderName = this.deps.llmProvider.constructor.name.replace("Provider", "").toLowerCase();

    let finalText: string;
    try {
      this.deps.analytics?.track("llm_enhancement_started", {
        provider: llmProviderName,
        model: this.deps.llmModelName,
      });
      this.currentStage = "enhancing";
      this.deps.onStage?.("enhancing");
      finalText = await this.deps.llmProvider.correct(rawText);
      slog.debug("LLM enhanced text", {
        finalText,
        length: finalText.length,
        changed: rawText !== finalText,
        originalWords: rawText.split(/\s+/).length,
        enhancedWords: finalText.split(/\s+/).length,
      });
      this.deps.analytics?.track("llm_enhancement_completed", {
        provider: llmProviderName,
        model: this.deps.llmModelName,
        duration_ms: Number((performance.now() - llmStartTime).toFixed(1)),
      });
    } catch (err: unknown) {
      slog.warn("LLM enhancement failed, using raw transcription", err instanceof Error ? err.message : err);
      this.deps.analytics?.track("llm_enhancement_failed", {
        provider: llmProviderName,
        model: this.deps.llmModelName,
        error_type: err instanceof Error ? err.name : "unknown",
      });
      this.deps.onLlmFailed?.();
      finalText = rawText;

      if (this.canceled || gen !== this.generation) {
        throw new CanceledError();
      }

      const totalTimeMs = Number((performance.now() - processingStartTime).toFixed(1));
      slog.info("Pipeline complete (LLM failed)", { totalTimeMs });
      this.currentStage = null;
      this.deps.onComplete?.({
        text: finalText,
        originalText: rawText,
        audioDurationMs,
        recording,
        llmFailed: true,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      return finalText;
    }

    if (this.canceled || gen !== this.generation) {
      throw new CanceledError();
    }

    const totalTimeMs = Number((performance.now() - processingStartTime).toFixed(1));
    slog.info("Pipeline complete", { totalTimeMs });
    this.currentStage = null;

    this.deps.onComplete?.({ text: finalText, originalText: rawText, audioDurationMs, recording });
    return finalText;
  }
}
