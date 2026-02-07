import { describe, it, expect, vi, beforeEach } from "vitest";
import { FoundryProvider } from "../../../src/main/llm/foundry";
import { type LlmProvider } from "../../../src/main/llm/provider";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("FoundryProvider", () => {
  let provider: LlmProvider;

  beforeEach(() => {
    provider = new FoundryProvider({
      endpoint: "https://foundry.example.com/anthropic",
      apiKey: "test-key",
      model: "claude-opus-4-6",
    });
    vi.clearAllMocks();
  });

  it("should return corrected text from the LLM", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: "I wanted to talk about the new feature." }],
      }),
    });

    const result = await provider.correct("so um I wanted to talk about the uh new feature");

    expect(result).toBe("I wanted to talk about the new feature.");
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it("should throw on HTTP error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () => "Unauthorized",
    });

    await expect(provider.correct("test")).rejects.toThrow("LLM request failed: 401 Unauthorized");
  });

  it("should send the system prompt and user text in the request body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: "cleaned text" }],
      }),
    });

    await provider.correct("raw text");

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);

    expect(body.system).toContain("speech-to-text post-processor");
    expect(body.messages[0].role).toBe("user");
    expect(body.messages[0].content).toBe("raw text");
  });

  it("should call the correct endpoint URL", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: "result" }],
      }),
    });

    await provider.correct("test");

    const url = mockFetch.mock.calls[0][0];
    expect(url).toBe("https://foundry.example.com/anthropic/v1/messages");
  });

  it("should send anthropic-version header", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: "result" }],
      }),
    });

    await provider.correct("test");

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    expect(headers["Authorization"]).toBe("Bearer test-key");
  });
});
