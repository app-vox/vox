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
}

export interface PaginatedResult<T> {
  entries: T[];
  total: number;
}
