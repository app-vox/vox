import { synthesize, testConnection } from "./elevenlabs";
import { getSelectedText } from "../input/selection";

export type TtsState = "idle" | "loading" | "playing" | "error";

interface TtsConfig {
  ttsEnabled: boolean;
  elevenLabsApiKey: string;
  elevenLabsVoiceId: string;
}

interface TtsManagerDeps {
  playAudio: (buffer: ArrayBuffer) => Promise<void>;
  stopAudio: () => Promise<void>;
  analytics?: { track(event: string, properties?: Record<string, unknown>): void };
}

export class TtsManager {
  private state: TtsState = "idle";
  private onStateChange: ((state: TtsState) => void) | null = null;
  private abortController: AbortController | null = null;
  private readonly deps: TtsManagerDeps;
  private cachedSelectedText: string = "";

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

    const text = this.cachedSelectedText || (await getSelectedText());
    this.cachedSelectedText = "";
    if (!text) {
      throw new Error("No text selected");
    }

    this.setState("loading");
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    const voiceId = config.elevenLabsVoiceId;
    this.deps.analytics?.track("tts_started", { voice_id: voiceId });
    const startTime = Date.now();

    try {
      const audio = await synthesize({
        text,
        apiKey: config.elevenLabsApiKey,
        voiceId,
        signal: this.abortController.signal,
      });

      if (signal.aborted) return;

      this.setState("playing");
      await this.deps.playAudio(audio);
      this.setState("idle");

      const durationMs = Date.now() - startTime;
      this.deps.analytics?.track("tts_completed", { voice_id: voiceId, duration_ms: durationMs });
    } catch (err) {
      if (signal.aborted) return;

      this.deps.analytics?.track("tts_failed", {
        voice_id: voiceId,
        error_type: err instanceof Error ? err.name : "unknown",
      });
      this.setState("error");
      setTimeout(() => this.setState("idle"), 2000);
      throw err;
    }
  }

  stop(): void {
    this.deps.analytics?.track("tts_stopped");
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.deps.stopAudio();
    this.setState("idle");
  }

  async testAndPlay(apiKey: string, voiceId: string): Promise<boolean> {
    const buffer = await testConnection(apiKey, voiceId);
    const success = buffer !== null;
    this.deps.analytics?.track("tts_test_connection", { success });
    if (!buffer) return false;
    await this.deps.playAudio(buffer);
    return true;
  }

  async hasSelectedText(): Promise<boolean> {
    const text = await getSelectedText();
    this.cachedSelectedText = text;
    return text.length > 0;
  }

  private setState(state: TtsState): void {
    this.state = state;
    this.onStateChange?.(state);
  }
}
