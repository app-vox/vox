import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("electron-log/main", () => ({
  default: {
    scope: vi.fn().mockReturnValue({
      info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(),
    }),
  },
}));

import { OpenAICompatibleProvider } from "../../../src/main/llm/openai-compatible";
import { type LlmProvider } from "../../../src/main/llm/provider";
import { LLM_SYSTEM_PROMPT } from "../../../src/shared/constants";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("OpenAICompatibleProvider", () => {
  let provider: LlmProvider;

  beforeEach(() => {
    provider = new OpenAICompatibleProvider({
      endpoint: "https://api.openai.com",
      apiKey: "sk-test-key",
      model: "gpt-4o",
      customPrompt: LLM_SYSTEM_PROMPT,
      hasCustomPrompt: false,
    });
    vi.clearAllMocks();
  });

  it("should return corrected text from the API", async () => {
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
      status: 429,
      statusText: "Too Many Requests",
      text: async () => "Rate limit exceeded",
    });

    await expect(provider.correct("test")).rejects.toThrow("LLM request failed: 429 Too Many Requests");
  });

  it("should throw when response has no content", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "" } }],
      }),
    });

    await expect(provider.correct("test")).rejects.toThrow("LLM returned no text content");
  });

  it("should throw when choices array is empty", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [] }),
    });

    await expect(provider.correct("test")).rejects.toThrow("LLM returned no text content");
  });

  it("should append /v1/chat/completions to the endpoint", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "result" } }],
      }),
    });

    await provider.correct("test");

    const url = mockFetch.mock.calls[0][0];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
  });

  it("should strip trailing slashes from endpoint before appending path", async () => {
    const providerWithSlash = new OpenAICompatibleProvider({
      endpoint: "https://api.openai.com///",
      apiKey: "key",
      model: "gpt-4o",
      customPrompt: LLM_SYSTEM_PROMPT,
      hasCustomPrompt: false,
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "result" } }],
      }),
    });

    await providerWithSlash.correct("test");

    const url = mockFetch.mock.calls[0][0];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
  });

  it("should send Bearer token in Authorization header", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "result" } }],
      }),
    });

    await provider.correct("test");

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["Authorization"]).toBe("Bearer sk-test-key");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("should send system and user messages in request body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "cleaned" } }],
      }),
    });

    await provider.correct("raw text");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messages).toEqual([
      { role: "system", content: LLM_SYSTEM_PROMPT },
      { role: "user", content: "raw text" },
    ]);
    expect(body.model).toBe("gpt-4o");
    expect(body.temperature).toBe(0.1);
    expect(body.max_tokens).toBe(4096);
  });

  it("should trim whitespace from response content", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "  trimmed  " } }],
      }),
    });

    const result = await provider.correct("test");
    expect(result).toBe("trimmed");
  });
});
