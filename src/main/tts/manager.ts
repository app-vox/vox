import { synthesize } from "./elevenlabs";
import { getSelectedText } from "../input/selection";

export type TtsState = "idle" | "loading" | "playing" | "error";

interface TtsConfig {
  ttsEnabled: boolean;
  elevenLabsApiKey: string;
  elevenLabsVoiceId: string;
}

interface TtsManagerDeps {
  playAudio: (buffer: ArrayBuffer) => Promise<void>;
}

export class TtsManager {
  private state: TtsState = "idle";
  private onStateChange: ((state: TtsState) => void) | null = null;
  private abortController: AbortController | null = null;
  private readonly deps: TtsManagerDeps;

  constructor(deps: TtsManagerDeps) {
    this.deps = deps;
  }

  setOnStateChange(cb: (state: TtsState) => void): void {
    this.onStateChange = cb;
  }

  getState(): TtsState {
    return this.state;
  }

  async play(config: TtsConfig): Promise<void> {
    if (!config.ttsEnabled) {
      throw new Error("TTS is not enabled");
    }

    if (!config.elevenLabsApiKey) {
      throw new Error("ElevenLabs API key is required");
    }

    const text = await getSelectedText();
    if (!text) {
      throw new Error("No text selected");
    }

    this.setState("loading");
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    try {
      const audio = await synthesize({
        text,
        apiKey: config.elevenLabsApiKey,
        voiceId: config.elevenLabsVoiceId,
      });

      if (signal.aborted) return;

      this.setState("playing");
      await this.deps.playAudio(audio);
      this.setState("idle");
    } catch (err) {
      if (signal.aborted) return;

      this.setState("error");
      setTimeout(() => this.setState("idle"), 2000);
      throw err;
    }
  }

  stop(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.setState("idle");
  }

  async hasSelectedText(): Promise<boolean> {
    const text = await getSelectedText();
    return text.length > 0;
  }

  private setState(state: TtsState): void {
    this.state = state;
    this.onStateChange?.(state);
  }
}
