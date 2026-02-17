import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("electron-log/main", () => ({
  default: {
    scope: vi.fn().mockReturnValue({
      info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(),
    }),
  },
}));

import { CustomProvider } from "../../../src/main/llm/custom";
import { type LlmProvider } from "../../../src/main/llm/provider";
import { LLM_SYSTEM_PROMPT } from "../../../src/shared/constants";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function createProvider(overrides: Partial<ConstructorParameters<typeof CustomProvider>[0]> = {}): LlmProvider {
  return new CustomProvider({
    endpoint: "https://my-llm.example.com/api/chat",
    token: "my-secret-token",
    tokenAttr: "Authorization",
    tokenSendAs: "header",
    model: "custom-model",
    customPrompt: LLM_SYSTEM_PROMPT,
    hasCustomPrompt: false,
    ...overrides,
  });
}

describe("CustomProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return corrected text from the API", async () => {
    const provider = createProvider();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Corrected text." } }],
      }),
    });

    const result = await provider.correct("raw text");

    expect(result).toBe("Corrected text.");
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it("should throw on HTTP error", async () => {
    const provider = createProvider();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: async () => "Server error",
    });

    await expect(provider.correct("test")).rejects.toThrow("LLM request failed: 500 Internal Server Error");
  });

  it("should throw when response has no content", async () => {
    const provider = createProvider();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [] }),
    });

    await expect(provider.correct("test")).rejects.toThrow("LLM returned no text content");
  });

  describe("token send modes", () => {
    it("should send token as header when tokenSendAs is 'header'", async () => {
      const provider = createProvider({
        tokenSendAs: "header",
        tokenAttr: "X-API-Key",
        token: "header-token",
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "result" } }],
        }),
      });

      await provider.correct("test");

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers["X-API-Key"]).toBe("header-token");
    });

    it("should send token in request body when tokenSendAs is 'body'", async () => {
      const provider = createProvider({
        tokenSendAs: "body",
        tokenAttr: "api_key",
        token: "body-token",
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "result" } }],
        }),
      });

      await provider.correct("test");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.api_key).toBe("body-token");
    });

    it("should send token as query parameter when tokenSendAs is 'query'", async () => {
      const provider = createProvider({
        endpoint: "https://my-llm.example.com/api/chat",
        tokenSendAs: "query",
        tokenAttr: "key",
        token: "query-token",
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "result" } }],
        }),
      });

      await provider.correct("test");

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe("https://my-llm.example.com/api/chat?key=query-token");
    });

    it("should append query param with & when URL already has query string", async () => {
      const provider = createProvider({
        endpoint: "https://my-llm.example.com/api/chat?version=2",
        tokenSendAs: "query",
        tokenAttr: "key",
        token: "query-token",
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "result" } }],
        }),
      });

      await provider.correct("test");

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe("https://my-llm.example.com/api/chat?version=2&key=query-token");
    });

    it("should URL-encode query parameter name and value", async () => {
      const provider = createProvider({
        endpoint: "https://my-llm.example.com/api",
        tokenSendAs: "query",
        tokenAttr: "api key",
        token: "tok&en=val",
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "result" } }],
        }),
      });

      await provider.correct("test");

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("api%20key=tok%26en%3Dval");
    });

    it("should not send token when token or tokenAttr is empty", async () => {
      const provider = createProvider({
        token: "",
        tokenAttr: "Authorization",
        tokenSendAs: "header",
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "result" } }],
        }),
      });

      await provider.correct("test");

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers["Authorization"]).toBeUndefined();
    });
  });

  it("should strip trailing slashes from endpoint", async () => {
    const provider = createProvider({
      endpoint: "https://my-llm.example.com/api///",
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "result" } }],
      }),
    });

    await provider.correct("test");

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toBe("https://my-llm.example.com/api");
  });

  it("should include model in body when provided", async () => {
    const provider = createProvider({ model: "my-model-v2" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "result" } }],
      }),
    });

    await provider.correct("test");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe("my-model-v2");
  });

  it("should omit model from body when empty", async () => {
    const provider = createProvider({ model: "" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "result" } }],
      }),
    });

    await provider.correct("test");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBeUndefined();
  });

  it("should send system and user messages", async () => {
    const provider = createProvider();
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
  });
});
