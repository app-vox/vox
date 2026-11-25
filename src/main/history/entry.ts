import type { AddEntryInput } from "./manager";

/** What the config says about the models behind a transcript. */
export interface EntryContext {
  whisperModel: string;
  llmEnhanced: boolean;
  llmProvider?: string;
  llmModel?: string;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** The history entry of a pipeline run that completed. */
export function completedEntry(
  result: {
    originalText: string;
    audioDurationMs: number;
    llmFailed?: boolean;
    errorMessage?: string;
    incomplete?: boolean;
  },
  finalText: string,
  context: EntryContext,
): AddEntryInput {
  return {
    text: finalText,
    originalText: result.originalText,
    audioDurationMs: result.audioDurationMs,
    wordCount: countWords(finalText),
    whisperModel: context.whisperModel,
    llmEnhanced: context.llmEnhanced,
    llmProvider: context.llmProvider,
    llmModel: context.llmModel,
    status: result.llmFailed ? "llm_failed" : "success",
    errorMessage: result.errorMessage,
    failedStep: result.llmFailed ? "llm" : undefined,
    ...(result.incomplete && { incomplete: true }),
  };
}

/**
 * What a retry from history writes over its entry. A retry without speech
 * names no `incomplete`, so the entry keeps the mark it had.
 */
export function retryUpdate(
  rawText: string,
  finalText: string,
  incomplete: boolean,
  context: EntryContext,
): Partial<AddEntryInput> {
  if (!rawText.trim()) {
    return { status: "whisper_failed", errorMessage: "No speech detected", failedStep: "garbage" };
  }
  return {
    text: finalText,
    originalText: rawText,
    wordCount: countWords(finalText),
    status: "success",
    errorMessage: undefined,
    failedStep: undefined,
    whisperModel: context.whisperModel,
    llmEnhanced: context.llmEnhanced,
    llmProvider: context.llmProvider,
    llmModel: context.llmModel,
    incomplete: incomplete ? true : undefined,
  };
}
