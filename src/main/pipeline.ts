import { type LlmProvider } from "./llm/provider";
import { NoopProvider } from "./llm/noop";
import { type RecordingResult } from "./audio/recorder";
import { type TranscriptionResult } from "./audio/whisper";
import { existsSync } from "fs";
import { t } from "../shared/i18n";
import log from "electron-log/main";

const slog = log.scope("Pipeline");

export type PipelineStage = "transcribing" | "enhancing";

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
    dictionary?: string[]
  ): Promise<TranscriptionResult>;
  llmProvider: LlmProvider;
  modelPath: string;
  dictionary?: string[];
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
    slog.info("Rejected Whisper hallucination", text);
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

export class NoModelError extends Error {
  constructor() {
    super(t("error.noModel"));
    this.name = "NoModelError";
  }
}

export class Pipeline {
  private readonly deps: PipelineDeps;
  private canceled = false;

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
    this.canceled = false; // Reset cancel flag on new recording
    await this.deps.recorder.start();
  }

  async stopAndProcess(): Promise<string> {
    const processingStartTime = performance.now();
    const recording = await this.deps.recorder.stop();

    if (this.canceled) {
      throw new CanceledError();
    }

    slog.info("Starting transcription pipeline");
    this.deps.analytics?.track("transcription_started", {
      whisper_model: this.whisperModelName,
    });
    slog.debug("Audio details", {
      bufferLength: recording.audioBuffer.length,
      sampleRate: recording.sampleRate,
    });

    this.deps.onStage?.("transcribing");
    let transcription: TranscriptionResult;
    try {
      transcription = await this.deps.transcribe(
        recording.audioBuffer,
        recording.sampleRate,
        this.deps.modelPath,
        this.deps.dictionary ?? []
      );
    } catch (err: unknown) {
      this.deps.analytics?.track("transcription_failed", {
        whisper_model: this.whisperModelName,
        error_type: err instanceof Error ? err.name : "unknown",
      });
      throw err;
    }

    if (this.canceled) {
      throw new CanceledError();
    }

    const rawText = transcription.text.trim();
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
      this.deps.onComplete?.({ text: rawText, originalText: rawText, audioDurationMs });
      return rawText;
    }

    slog.info("Checking for garbage transcription");
    if (!rawText || isGarbageTranscription(rawText)) {
      slog.info("Transcription rejected as empty or garbage");
      this.deps.analytics?.track("transcription_garbage_detected", {
        whisper_model: this.whisperModelName,
      });
      return "";
    }
    slog.info("Transcription passed, sending to LLM");

    if (this.canceled) {
      throw new CanceledError();
    }

    if (this.deps.dictionary && this.deps.dictionary.length > 0) {
      this.deps.analytics?.track("dictionary_used", {
        term_count: this.deps.dictionary.length,
      });
    }

    if (this.deps.hasCustomPrompt) {
      this.deps.analytics?.track("custom_prompt_used");
    }

    const llmStartTime = performance.now();
    const llmProviderName = this.deps.llmProvider.constructor.name.replace("Provider", "").toLowerCase();

    let finalText: string;
    try {
      this.deps.analytics?.track("llm_enhancement_started", {
        provider: llmProviderName,
        model: this.deps.llmModelName,
      });
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
      // LLM failed — fall back to raw transcription
      slog.warn("LLM enhancement failed, using raw transcription", err instanceof Error ? err.message : err);
      this.deps.analytics?.track("llm_enhancement_failed", {
        provider: llmProviderName,
        model: this.deps.llmModelName,
        error_type: err instanceof Error ? err.name : "unknown",
      });
      finalText = rawText;
    }

    if (this.canceled) {
      throw new CanceledError();
    }

    const totalTimeMs = Number((performance.now() - processingStartTime).toFixed(1));
    slog.info("Pipeline complete", { totalTimeMs });

    this.deps.onComplete?.({ text: finalText, originalText: rawText, audioDurationMs });
    return finalText;
  }
}
