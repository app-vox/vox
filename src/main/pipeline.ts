import { type LlmProvider } from "./llm/provider";
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
  paste(text: string): void;
  modelPath: string;
  onStage?: (stage: PipelineStage) => void;
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

    const rawText = transcription.text;

    let finalText: string;
    try {
      this.deps.onStage?.("correcting");
      finalText = await this.deps.llmProvider.correct(rawText);
    } catch {
      // LLM failed — fall back to raw transcription
      finalText = rawText;
    }

    this.deps.paste(finalText);
    return finalText;
  }
}
