import { describe, it, expect, vi, beforeEach } from "vitest";
import { synthesize, testConnection } from "../../../src/main/tts/elevenlabs";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("elevenlabs", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe("synthesize", () => {
    it("calls ElevenLabs API with correct parameters", async () => {
      const fakeAudio = new ArrayBuffer(100);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(fakeAudio),
      });

      const result = await synthesize({
        text: "Hello world",
        apiKey: "test-key",
        voiceId: "21m00Tcm4TlvDq8ikWAM",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
        expect.objectContaining({
          method: "POST",
          headers: {
            "xi-api-key": "test-key",
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({
            text: "Hello world",
            model_id: "eleven_multilingual_v2",
          }),
        }),
      );
      expect(result).toEqual(fakeAudio);
    });

    it("throws on API error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: () => Promise.resolve("Invalid API key"),
      });

      await expect(
        synthesize({ text: "test", apiKey: "bad-key", voiceId: "21m00Tcm4TlvDq8ikWAM" }),
      ).rejects.toThrow();
    });

    it("throws on empty text", async () => {
      await expect(
        synthesize({ text: "", apiKey: "key", voiceId: "21m00Tcm4TlvDq8ikWAM" }),
      ).rejects.toThrow();
    });

    it("throws when text exceeds maximum length", async () => {
      const longText = "a".repeat(5001);
      await expect(
        synthesize({ text: longText, apiKey: "key", voiceId: "21m00Tcm4TlvDq8ikWAM" }),
      ).rejects.toThrow("Text exceeds maximum length of 5000 characters");
    });

    it("passes abort signal to fetch", async () => {
      const fakeAudio = new ArrayBuffer(100);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(fakeAudio),
      });

      const controller = new AbortController();
      await synthesize({
        text: "Hello",
        apiKey: "key",
        voiceId: "21m00Tcm4TlvDq8ikWAM",
        signal: controller.signal,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });

  describe("testConnection", () => {
    it("returns audio buffer on successful synthesis", async () => {
      const fakeAudio = new ArrayBuffer(50);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(fakeAudio),
      });
      const result = await testConnection("test-key", "21m00Tcm4TlvDq8ikWAM");
      expect(result).toEqual(fakeAudio);
    });

    it("returns null on failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: () => Promise.resolve("bad key"),
      });
      const result = await testConnection("bad-key", "21m00Tcm4TlvDq8ikWAM");
      expect(result).toBeNull();
    });
  });
});
