export type TranscriptionStatus = "success" | "whisper_failed" | "llm_failed";

export interface TranscriptionEntry {
  id: string;
  timestamp: string;
  text: string;
  originalText: string;
  wordCount: number;
  audioDurationMs: number;
  whisperModel: string;
  llmEnhanced: boolean;
  llmProvider?: string;
  llmModel?: string;
  status: TranscriptionStatus;
  audioFilePath?: string;
  errorMessage?: string;
  failedStep?: "whisper" | "llm";
}

export interface PaginatedResult<T> {
  entries: T[];
  total: number;
}
