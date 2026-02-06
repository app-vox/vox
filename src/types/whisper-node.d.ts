declare module "whisper-node" {
  interface WhisperOptions {
    modelName?: string;
    modelPath?: string;
    whisperOptions?: {
      language?: string;
      word_timestamps?: boolean;
      timestamp_size?: number;
      gen_file_txt?: boolean;
      gen_file_subtitle?: boolean;
      gen_file_vtt?: boolean;
    };
    shellOptions?: Record<string, unknown>;
  }

  interface WhisperSegment {
    start: string;
    end: string;
    speech: string;
  }

  function whisper(
    filePath: string,
    options: WhisperOptions
  ): Promise<WhisperSegment[] | undefined>;

  export default whisper;
}
