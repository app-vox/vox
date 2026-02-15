import { describe, it, expect, vi, beforeEach } from "vitest";

const mockScopedLog = {
  info: vi.fn(),
  debug: vi.fn(),
};

vi.mock("electron-log/main", () => ({
  default: {
    scope: vi.fn(() => mockScopedLog),
  },
}));

import { BaseLlmProvider } from "../../../src/main/llm/base-provider";

class TestProvider extends BaseLlmProvider {
  protected readonly providerName = "TestProvider";
  private readonly enhanceFn: (rawText: string) => Promise<string>;

  constructor(
    enhanceFn: (rawText: string) => Promise<string>,
    customPrompt = "default prompt",
    hasCustom = false,
  ) {
    super(customPrompt, hasCustom);
    this.enhanceFn = enhanceFn;
  }

  protected enhance(rawText: string): Promise<string> {
    return this.enhanceFn(rawText);
  }
}

describe("BaseLlmProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls enhance() and returns its result", async () => {
    const provider = new TestProvider(
      async (raw) => `corrected: ${raw}`,
    );

    const result = await provider.correct("hello world");

    expect(result).toBe("corrected: hello world");
  });

  it("logs request info with hasCustomPrompt before calling enhance", async () => {
    const enhanceFn = vi.fn<(raw: string) => Promise<string>>().mockResolvedValue("result");
    const provider = new TestProvider(enhanceFn, "my prompt", true);

    await provider.correct("some text");

    // info should have been called before enhance
    expect(mockScopedLog.info).toHaveBeenCalledWith(
      "Enhancing text",
      { hasCustomPrompt: true },
    );
  });

  it("logs response info with correctedText after enhance completes", async () => {
    const provider = new TestProvider(
      async () => "fixed text",
    );

    await provider.correct("raw text");

    expect(mockScopedLog.info).toHaveBeenCalledWith(
      "Enhanced text",
      { correctedText: "fixed text" },
    );
  });

  it("logs debug details including rawText, rawTextLength, and systemPrompt", async () => {
    const provider = new TestProvider(
      async () => "result",
      "system prompt here",
      false,
    );

    await provider.correct("raw input");

    expect(mockScopedLog.debug).toHaveBeenCalledWith(
      "Request details",
      {
        rawTextLength: "raw input".length,
        rawText: "raw input",
        systemPrompt: "system prompt here",
      },
    );
  });

  it("logs response stats with length and charDiff", async () => {
    const provider = new TestProvider(
      async () => "longer result text",
      "prompt",
      false,
    );

    await provider.correct("short");

    expect(mockScopedLog.debug).toHaveBeenCalledWith(
      "Response stats",
      {
        length: "longer result text".length,
        charDiff: "longer result text".length - "short".length,
      },
    );
  });

  it("propagates errors from enhance() without catching them", async () => {
    const error = new Error("API call failed");
    const provider = new TestProvider(async () => {
      throw error;
    });

    await expect(provider.correct("text")).rejects.toThrow("API call failed");
  });

  it("creates a scoped logger with the provider name", async () => {
    const log = await import("electron-log/main");
    const provider = new TestProvider(async () => "ok");

    await provider.correct("test");

    expect(log.default.scope).toHaveBeenCalledWith("TestProvider");
  });
});
