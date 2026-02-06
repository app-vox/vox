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
      endpoint: "https://foundry.example.com",
      apiKey: "test-key",
      model: "gpt-4o",
    });
    vi.clearAllMocks();
  });

  it("should return corrected text from the LLM", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "I wanted to talk about the new feature." } }],
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
    });

    await expect(provider.correct("test")).rejects.toThrow("LLM request failed: 401 Unauthorized");
  });

  it("should send the system prompt and user text in the request body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "cleaned text" } }],
      }),
    });

    await provider.correct("raw text");

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);

    expect(body.messages[0].role).toBe("system");
    expect(body.messages[0].content).toContain("speech-to-text post-processor");
    expect(body.messages[1].role).toBe("user");
    expect(body.messages[1].content).toBe("raw text");
  });
});
