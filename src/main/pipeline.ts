import { type LlmProvider } from "./llm/provider";
import { NoopProvider } from "./llm/noop";
import { type VoxConfig } from "../shared/config";
import { activeInstructions } from "../shared/prompts";
import { type RecordingResult } from "./audio/recorder";
import { type TranscriptionResult, type WhisperPass } from "./audio/whisper";
import { buildWhisperArgs, buildWhisperPrompt } from "../shared/constants";
import { RECORDER_SAMPLE_RATE } from "./chunking/constants";
import { ChunkedRecording } from "./chunking/recording";
import { type ChunkReport, type SessionResult } from "./chunking/session";
import { detectGarbage } from "./garbage";
import { existsSync } from "fs";
import { t } from "../shared/i18n";
import log from "electron-log/main";

const slog = log.scope("Pipeline");

const GARBAGE_AUDIO_THRESHOLD_MS = 5000;

export type PipelineStage = "transcribing" | "enhancing";

export interface PipelineDeps {
  recorder: {
    start(): Promise<void>;
    stop(): Promise<RecordingResult>;
    cancel(): Promise<void>;
    snapshot?(maxSeconds?: number): Promise<RecordingResult | null>;
    /** The samples recorded after the first `offset`; a recorder without it is transcribed once it stops. */
    samplesFrom?(offset: number): Promise<Float32Array>;
    playAudioCue?(samples: number[], sampleRate?: number): Promise<void>;
  };
  transcribe(
    audioBuffer: Float32Array,
    sampleRate: number,
    modelPath: string,
    pass: WhisperPass
  ): Promise<TranscriptionResult>;
  /** Reads the current config when an enhancement starts, so a prompt switch applies to the next one. */
  loadConfig(): VoxConfig;
  createLlmProvider(config: VoxConfig): LlmProvider;
  modelPath: string;
  dictionary?: string[];
  speechLanguages?: string[];
  llmModelName?: string;
  analytics?: {
    track(event: string, properties?: Record<string, unknown>): void;
  };
  onStage?: (stage: PipelineStage) => void;
  onTranscriptionComplete?: (rawText: string) => void;
  onComplete?: (result: {
    text: string;
    originalText: string;
    audioDurationMs: number;
    recording: RecordingResult;
    llmFailed?: boolean;
    errorMessage?: string;
    /** The transcript holds a collapsed loop or lacks a chunk that failed; present only as `true`. */
    incomplete?: boolean;
  }) => void;
  onLlmFailed?: () => void;
  onFailure?: (result: {
    failedStep: "whisper" | "garbage";
    error: Error;
    recording: RecordingResult;
    audioDurationMs: number;
  }) => void;
}

/** The provider and analytics flag of one dictation's enhancement, built from one config snapshot. */
interface Enhancement {
  llmProvider: LlmProvider;
  hasCustomPrompt: boolean;
}

/** What a run measured before its enhancement, for its timing line. */
interface RunStats {
  whisperMs: number;
  chunks: number;
  waitAfterStopMs: number;
}

const NO_STATS: RunStats = { whisperMs: 0, chunks: 0, waitAfterStopMs: 0 };

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
  /** What the session said of the held transcription: a chunk's text is a collapsed loop, or a chunk failed. */
  private heldIncomplete = false;
  /** The chunk passes of the recording being made, canceled or transcribed; one per recording. */
  private chunked: ChunkedRecording | null = null;
  /** The recorder's stop, started by a cancel while listening. */
  private stopping: Promise<void> | null = null;
  /** Stops the live-preview transcriptions in flight, so they do not share the GPU with the final one. */
  private readonly previewAborts = new Set<AbortController>();

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
    this.dropRecording();
    try {
      await this.deps.recorder.cancel();
    } catch (err) {
      slog.error("Error canceling recorder", err);
    }
  }

  async playAudioCue(samples: number[], sampleRate?: number): Promise<void> {
    await this.deps.recorder.playAudioCue?.(samples, sampleRate);
  }

  async snapshotAndTranscribe(): Promise<string | null> {
    const preview = new AbortController();
    this.previewAborts.add(preview);
    try {
      // Full buffer — gives Whisper all context for the most accurate preview
      const snapshot = await this.deps.recorder.snapshot?.();
      if (!snapshot || snapshot.audioBuffer.length === 0) return null;
      // Require at least 0.5s of audio for meaningful transcription
      const durationMs = (snapshot.audioBuffer.length / snapshot.sampleRate) * 1000;
      if (durationMs < 500) return null;
      const result = await this.deps.transcribe(
        snapshot.audioBuffer,
        snapshot.sampleRate,
        this.deps.modelPath,
        this.buildPass(preview.signal),
      );
      const text = result.text
        .replace(/\[[^\]]*\]/g, "")
        .replace(/\([^)]*\)/g, "")
        .replace(/\*[^*]*\*/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();
      if (!text || !!detectGarbage(text)) return null;
      return text;
    } catch {
      return null;
    } finally {
      this.previewAborts.delete(preview);
    }
  }

  private abortPreviews(): void {
    for (const preview of this.previewAborts) preview.abort();
  }

  async startRecording(): Promise<void> {
    if (!existsSync(this.deps.modelPath)) {
      throw new NoModelError();
    }
    this.canceled = false;
    this.cancelingStage = null;
    this.heldRecording = null;
    this.heldTranscription = null;
    this.heldIncomplete = false;
    this.stopping = null;
    this.currentStage = "listening";
    this.generation++;
    this.dropRecording();
    await this.deps.recorder.start();
    const chunked = this.newRecording(RECORDER_SAMPLE_RATE);
    this.chunked = chunked;
    if (this.deps.recorder.samplesFrom) chunked.startCapture({ samplesFrom: (offset) => this.deps.recorder.samplesFrom!(offset) });
  }

  async stopAndProcess(): Promise<string> {
    const stopStart = performance.now();
    const gen = this.generation;
    this.abortPreviews();
    await this.chunked?.endCapture();
    const recording = await this.deps.recorder.stop();
    this.heldRecording = recording;

    if (this.canceled || gen !== this.generation) {
      throw new CanceledError();
    }

    return this.processFromRecording(recording, gen, stopStart);
  }

  /**
   * Stop recording and process using pre-accumulated live preview text,
   * skipping the Whisper transcription step entirely. Falls back to full
   * Whisper transcription if the hint is empty or detected as garbage.
   */
  async stopAndProcessWithHint(hintText: string): Promise<string> {
    const stopStart = performance.now();
    const gen = this.generation;
    this.abortPreviews();
    await this.chunked?.endCapture();
    const recording = await this.deps.recorder.stop();
    this.heldRecording = recording;

    if (this.canceled || gen !== this.generation) {
      throw new CanceledError();
    }

    const rawText = hintText.trim();
    if (!rawText || !!detectGarbage(rawText)) {
      slog.info("Preview hint empty or garbage — falling back to Whisper");
      return this.processFromRecording(recording, gen, stopStart);
    }

    slog.info("Using live preview as transcript, skipping Whisper: %s", rawText.slice(0, 80));
    this.heldTranscription = rawText;
    this.dropRecording();
    this.deps.onTranscriptionComplete?.(rawText);

    if (this.canceled || gen !== this.generation) {
      throw new CanceledError();
    }

    return this.processFromTranscription(rawText, recording, gen, this.startEnhancement());
  }

  gracefulCancel(): { stage: PipelineStage | "listening" } {
    const stage = this.currentStage ?? "listening";
    this.cancelingStage = stage;
    this.canceled = true;

    this.chunked?.pause();
    if (stage === "listening") {
      this.stopping = this.deps.recorder.stop().then((recording) => {
        this.heldRecording = recording;
      }).catch(() => {
        // If stop fails (already stopped), heldRecording may already be set
      });
    }

    return { stage };
  }

  async undoCancel(): Promise<string> {
    if (!this.cancelingStage) throw new Error("Not in canceling state");

    const undoStart = performance.now();
    const stage = this.cancelingStage;
    await this.stopping;
    this.stopping = null;
    if (!this.cancelingStage) throw new CanceledError();
    this.cancelingStage = null;
    this.canceled = false;
    this.generation++;
    const gen = this.generation;

    if (stage === "enhancing" && this.heldTranscription) {
      return this.processFromTranscription(this.heldTranscription, this.heldRecording!, gen, this.startEnhancement());
    }

    this.chunked?.resume();
    return this.processFromRecording(this.heldRecording!, gen, undoStart);
  }

  async retryFromRecording(recording: RecordingResult): Promise<string> {
    const retryStart = performance.now();
    if (!existsSync(this.deps.modelPath)) {
      throw new NoModelError();
    }
    this.dropRecording();
    this.stopping = null;
    this.canceled = false;
    this.cancelingStage = null;
    this.heldRecording = recording;
    this.heldTranscription = null;
    this.heldIncomplete = false;
    this.currentStage = null;
    this.generation++;
    const gen = this.generation;

    return this.processFromRecording(recording, gen, retryStart);
  }

  confirmCancel(): void {
    this.dropRecording();
    this.stopping = null;
    this.cancelingStage = null;
    this.heldRecording = null;
    this.heldTranscription = null;
    this.heldIncomplete = false;
    this.currentStage = null;
    this.canceled = true;
  }

  isCanceling(): boolean {
    return this.cancelingStage !== null;
  }

  /** Whether the transcript of the last transcribed recording is incomplete. */
  lastTranscriptIncomplete(): boolean {
    return this.heldIncomplete;
  }

  /** The pass of this pipeline's dictionary and languages. */
  private buildPass(signal: AbortSignal): WhisperPass {
    const speechLanguages = this.deps.speechLanguages ?? [];
    const whisperArgs = buildWhisperArgs(speechLanguages);
    return {
      prompt: buildWhisperPrompt(this.deps.dictionary ?? [], whisperArgs.promptPrefix),
      language: whisperArgs.language,
      speechLanguages,
      signal,
    };
  }

  /** Sends the loop retry events of the chunks' passes: one for each pass with a temperature, and one more for the pass that gave its chunk the text. */
  private trackLoopRetries(chunks: ChunkReport[]): void {
    for (const chunk of chunks) {
      const passes = chunk.passes.filter((pass) => pass.result !== "aborted");
      passes.forEach((pass, i) => {
        if (pass.temperature === undefined) return;
        const retry = { attempt: i + 1, temperature: pass.temperature, skip_prompt: pass.bare };
        this.deps.analytics?.track("transcription_loop_retry", { whisper_model: this.whisperModelName, ...retry });
        if (pass.result === "text") {
          this.deps.analytics?.track("transcription_loop_retry_succeeded", retry);
        }
      });
    }
  }

  /** A recording's chunk passes, with `enhancing` read from the config once, now. */
  private newRecording(sampleRate: number): ChunkedRecording {
    const config = this.deps.loadConfig();
    return new ChunkedRecording({
      sampleRate,
      transcribe: this.deps.transcribe,
      modelPath: this.deps.modelPath,
      dictionary: this.deps.dictionary ?? [],
      speechLanguages: this.deps.speechLanguages ?? [],
      log: slog,
      enhancing: () => !(this.deps.createLlmProvider(config) instanceof NoopProvider),
    });
  }

  /** Aborts the recording's passes and lets it go. */
  private dropRecording(): void {
    this.chunked?.abort();
    this.chunked = null;
  }

  /** Lets `chunked` go once its run has ended; a newer recording stays. */
  private releaseRecording(chunked: ChunkedRecording): void {
    if (this.chunked === chunked) this.chunked = null;
  }

  /** The one line of a run's timing: `message` says how the run ended. */
  private logTiming(
    message: string,
    fields: Record<string, unknown> & { audioDurationMs: number },
    stats: RunStats,
    processingStartTime: number,
    llmMs = 0,
  ): void {
    slog.info(message, {
      whisperModel: this.whisperModelName,
      ...fields,
      whisperMs: stats.whisperMs,
      llmMs,
      totalMs: Number((performance.now() - processingStartTime).toFixed(1)),
      chunks: stats.chunks,
      waitAfterStopMs: stats.waitAfterStopMs,
    });
  }

  /** `waitStart` is when the stop, the undo or the retry was asked for. */
  private async processFromRecording(
    recording: RecordingResult,
    gen: number,
    waitStart: number
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
    let chunked = this.chunked;
    if (!chunked || chunked.sampleRate !== recording.sampleRate) {
      chunked?.abort();
      chunked = this.chunked = this.newRecording(recording.sampleRate);
    }
    let result: SessionResult | undefined;
    let stats = NO_STATS;
    try {
      const finished = await chunked.finish(recording);
      if (finished === null || this.canceled || gen !== this.generation) {
        throw new CanceledError();
      }
      result = finished;
      stats = {
        whisperMs: Number(result.whisperMs.toFixed(1)),
        chunks: result.chunks.length,
        waitAfterStopMs: Number((performance.now() - waitStart).toFixed(1)),
      };
      if (!result.text && result.error) throw result.error;
    } catch (err: unknown) {
      if (err instanceof CanceledError) throw err;
      if (result) {
        this.logTiming("Pipeline timing (whisper failed)", {
          audioDurationMs: Math.round((recording.audioBuffer.length / recording.sampleRate) * 1000),
        }, stats, processingStartTime);
      }
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
      this.releaseRecording(chunked);
      throw err;
    }

    this.trackLoopRetries(result.chunks);
    const rawText = result.text;
    this.heldTranscription = rawText;
    this.heldIncomplete = result.incomplete;
    const audioDurationMs = Math.round((recording.audioBuffer.length / recording.sampleRate) * 1000);
    this.deps.analytics?.track("transcription_completed", {
      whisper_model: this.whisperModelName,
      duration_ms: Number((performance.now() - processingStartTime).toFixed(1)),
      word_count: rawText.split(/\s+/).filter(Boolean).length,
      audio_duration_ms: audioDurationMs,
    });
    slog.info("Whisper transcription", rawText);
    const enhancement = this.startEnhancement();
    slog.debug("Transcription details", {
      rawTextLength: rawText.length,
      llmProviderType: enhancement.llmProvider.constructor.name,
    });

    if (enhancement.llmProvider instanceof NoopProvider) {
      this.logTiming("Pipeline timing", { audioDurationMs }, stats, processingStartTime);
      this.deps.analytics?.track("llm_enhancement_skipped");
      if (!rawText) {
        this.releaseRecording(chunked);
        return "";
      }
      this.deps.onTranscriptionComplete?.(rawText);
      this.currentStage = null;
      this.deps.onComplete?.({
        text: rawText,
        originalText: rawText,
        audioDurationMs,
        recording,
        ...(this.heldIncomplete && { incomplete: true }),
      });
      this.releaseRecording(chunked);
      return rawText;
    }

    if (!rawText) {
      const dropped = result.chunks.find((chunk) => chunk.outcome.startsWith("dropped:"));
      const garbageReason = dropped ? dropped.outcome.slice("dropped:".length) : "short";
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
      this.logTiming("Pipeline timing", { audioDurationMs }, stats, processingStartTime);
      this.releaseRecording(chunked);
      return "";
    }
    slog.info("Transcription passed, sending to LLM");
    this.deps.onTranscriptionComplete?.(rawText);

    if (this.canceled || gen !== this.generation) {
      throw new CanceledError();
    }

    const text = await this.processFromTranscription(rawText, recording, gen, enhancement, stats, processingStartTime);
    this.releaseRecording(chunked);
    return text;
  }

  /** Snapshots the config once, so the provider and the analytics flag agree on the active prompt. */
  private startEnhancement(): Enhancement {
    const config = this.deps.loadConfig();
    return {
      llmProvider: this.deps.createLlmProvider(config),
      hasCustomPrompt: activeInstructions(config) !== null,
    };
  }

  private async processFromTranscription(
    rawText: string,
    recording: RecordingResult,
    gen: number,
    enhancement: Enhancement,
    stats: RunStats = NO_STATS,
    processingStartTime = performance.now()
  ): Promise<string> {
    const audioDurationMs = Math.round((recording.audioBuffer.length / recording.sampleRate) * 1000);

    if (this.deps.dictionary && this.deps.dictionary.length > 0) {
      this.deps.analytics?.track("dictionary_used", {
        term_count: this.deps.dictionary.length,
      });
    }

    if (enhancement.hasCustomPrompt) {
      this.deps.analytics?.track("custom_prompt_used");
    }

    if (this.deps.speechLanguages && this.deps.speechLanguages.length > 0) {
      this.deps.analytics?.track("speech_languages_used", {
        language_count: this.deps.speechLanguages.length,
        languages: this.deps.speechLanguages.join(","),
      });
    }

    const llmStartTime = performance.now();
    const llmProviderName = enhancement.llmProvider.constructor.name.replace("Provider", "").toLowerCase();

    let finalText: string;
    try {
      this.deps.analytics?.track("llm_enhancement_started", {
        provider: llmProviderName,
        model: this.deps.llmModelName,
      });
      this.currentStage = "enhancing";
      this.deps.onStage?.("enhancing");
      finalText = await enhancement.llmProvider.correct(rawText);
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

      const llmTimeMs = Number((performance.now() - llmStartTime).toFixed(1));
      this.logTiming("Pipeline timing (LLM failed)", { llmProvider: llmProviderName, llmModel: this.deps.llmModelName, audioDurationMs }, stats, processingStartTime, llmTimeMs);
      this.currentStage = null;
      this.deps.onComplete?.({
        text: finalText,
        originalText: rawText,
        audioDurationMs,
        recording,
        llmFailed: true,
        errorMessage: err instanceof Error ? err.message : String(err),
        ...(this.heldIncomplete && { incomplete: true }),
      });
      return finalText;
    }

    if (this.canceled || gen !== this.generation) {
      throw new CanceledError();
    }

    const llmTimeMs = Number((performance.now() - llmStartTime).toFixed(1));
    this.logTiming("Pipeline timing", { llmProvider: llmProviderName, llmModel: this.deps.llmModelName, audioDurationMs }, stats, processingStartTime, llmTimeMs);
    this.currentStage = null;

    this.deps.onComplete?.({
      text: finalText,
      originalText: rawText,
      audioDurationMs,
      recording,
      ...(this.heldIncomplete && { incomplete: true }),
    });
    return finalText;
  }
}
