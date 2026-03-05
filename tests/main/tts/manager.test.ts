import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TtsManager } from "../../../src/main/tts/manager";
import { synthesize } from "../../../src/main/tts/elevenlabs";
import { getSelectedText } from "../../../src/main/input/selection";

vi.mock("../../../src/main/tts/elevenlabs", () => ({
  synthesize: vi.fn(),
}));

vi.mock("../../../src/main/input/selection", () => ({
  getSelectedText: vi.fn(),
}));

const mockSynthesize = vi.mocked(synthesize);
const mockGetSelectedText = vi.mocked(getSelectedText);

function validConfig() {
  return {
    ttsEnabled: true,
    elevenLabsApiKey: "test-api-key",
    elevenLabsVoiceId: "voice-123",
  };
}

describe("TtsManager", () => {
  let manager: TtsManager;
  let playAudio: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    playAudio = vi.fn().mockResolvedValue(undefined);
    manager = new TtsManager({ playAudio });
    mockSynthesize.mockReset();
    mockGetSelectedText.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports idle state initially", () => {
    expect(manager.getState()).toBe("idle");
  });

  it("throws if TTS not enabled", async () => {
    const config = { ...validConfig(), ttsEnabled: false };
    await expect(manager.play(config)).rejects.toThrow("TTS is not enabled");
  });

  it("throws if no API key", async () => {
    const config = { ...validConfig(), elevenLabsApiKey: "" };
    await expect(manager.play(config)).rejects.toThrow("API key");
  });

  it("throws if no text selected", async () => {
    mockGetSelectedText.mockResolvedValue("");
    await expect(manager.play(validConfig())).rejects.toThrow(
      "No text selected",
    );
  });

  it("synthesizes and plays audio on success", async () => {
    const fakeAudio = new ArrayBuffer(256);
    mockGetSelectedText.mockResolvedValue("Hello world");
    mockSynthesize.mockResolvedValue(fakeAudio);

    const states: string[] = [];
    manager.setOnStateChange((s) => states.push(s));

    await manager.play(validConfig());

    expect(mockSynthesize).toHaveBeenCalledWith({
      text: "Hello world",
      apiKey: "test-api-key",
      voiceId: "voice-123",
    });
    expect(playAudio).toHaveBeenCalledWith(fakeAudio);
    expect(states).toEqual(["loading", "playing", "idle"]);
    expect(manager.getState()).toBe("idle");
  });

  it("can stop playback", async () => {
    const fakeAudio = new ArrayBuffer(256);
    mockGetSelectedText.mockResolvedValue("Hello world");

    mockSynthesize.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(fakeAudio), 5000);
        }),
    );

    const playPromise = manager.play(validConfig());
    // Flush microtasks so play() passes the awaited getSelectedText()
    await vi.advanceTimersByTimeAsync(0);
    expect(manager.getState()).toBe("loading");

    manager.stop();
    expect(manager.getState()).toBe("idle");

    // Advance past the synthesize timeout so the promise settles
    await vi.advanceTimersByTimeAsync(5000);
    await playPromise;
    expect(playAudio).not.toHaveBeenCalled();
  });

  it("sets error state and resets after timeout on failure", async () => {
    mockGetSelectedText.mockResolvedValue("Hello world");
    mockSynthesize.mockRejectedValue(new Error("API error"));

    const states: string[] = [];
    manager.setOnStateChange((s) => states.push(s));

    await expect(manager.play(validConfig())).rejects.toThrow("API error");

    expect(manager.getState()).toBe("error");
    expect(states).toContain("error");

    vi.advanceTimersByTime(2000);

    expect(manager.getState()).toBe("idle");
    expect(states[states.length - 1]).toBe("idle");
  });

  describe("hasSelectedText", () => {
    it("returns true when text is selected", async () => {
      mockGetSelectedText.mockResolvedValue("some text");
      expect(await manager.hasSelectedText()).toBe(true);
    });

    it("returns false when no text is selected", async () => {
      mockGetSelectedText.mockResolvedValue("");
      expect(await manager.hasSelectedText()).toBe(false);
    });
  });
});
