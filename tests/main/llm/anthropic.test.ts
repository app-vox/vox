import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("electron-log/main", () => ({
  default: {
    scope: vi.fn().mockReturnValue({
      info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(),
    }),
  },
}));

import { AnthropicProvider } from "../../../src/main/llm/anthropic";
import { type LlmProvider } from "../../../src/main/llm/provider";
import { LLM_SYSTEM_PROMPT } from "../../../src/shared/constants";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("AnthropicProvider", () => {
  let provider: LlmProvider;

  beforeEach(() => {
    provider = new AnthropicProvider({
      apiKey: "sk-ant-test-key",
      model: "claude-sonnet-4-20250514",
      customPrompt: LLM_SYSTEM_PROMPT,
      hasCustomPrompt: false,
    });
    vi.clearAllMocks();
  });

  it("should return corrected text from Anthropic API", async () => {
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
      text: async () => "Invalid API key",
    });

    await expect(provider.correct("test")).rejects.toThrow("LLM request failed: 401 Unauthorized");
  });

  it("should throw when response has no text block", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ type: "tool_use", text: "" }],
      }),
    });

    await expect(provider.correct("test")).rejects.toThrow("LLM returned no text content");
  });

  it("should call the Anthropic messages endpoint", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: "result" }],
      }),
    });

    await provider.correct("test");

    const url = mockFetch.mock.calls[0][0];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
  });

  it("should send x-api-key and anthropic-version headers", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: "result" }],
      }),
    });

    await provider.correct("test");

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["x-api-key"]).toBe("sk-ant-test-key");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("should send the system prompt and user text in the request body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: "cleaned text" }],
      }),
    });

    await provider.correct("raw text");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.system).toBe(LLM_SYSTEM_PROMPT);
    expect(body.messages[0].role).toBe("user");
    expect(body.messages[0].content).toBe("raw text");
    expect(body.model).toBe("claude-sonnet-4-20250514");
    expect(body.temperature).toBe(0.1);
    expect(body.max_tokens).toBe(4096);
  });

  it("should trim whitespace from response text", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: "  trimmed result  " }],
      }),
    });

    const result = await provider.correct("test");
    expect(result).toBe("trimmed result");
  });
});
