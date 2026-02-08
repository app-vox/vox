import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted ensures these are available when vi.mock factories run (they're hoisted)
const { mockSend, mockFromIni } = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockFromIni: vi.fn().mockReturnValue("ini-credentials"),
}));

vi.mock("@aws-sdk/client-bedrock-runtime", () => ({
  BedrockRuntimeClient: vi.fn().mockImplementation(function (this: Record<string, unknown>) { this.send = mockSend; }),
  ConverseCommand: vi.fn().mockImplementation(function (this: Record<string, unknown>, input: unknown) { this.input = input; }),
}));

vi.mock("@aws-sdk/credential-provider-ini", () => ({
  fromIni: mockFromIni,
}));

import { BedrockProvider } from "../../../src/main/llm/bedrock";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { type LlmProvider } from "../../../src/main/llm/provider";
import { LLM_SYSTEM_PROMPT } from "../../../src/shared/constants";

describe("BedrockProvider", () => {
  let provider: LlmProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new BedrockProvider({
      region: "us-east-1",
      profile: "",
      accessKeyId: "",
      secretAccessKey: "",
      modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
      customPrompt: LLM_SYSTEM_PROMPT,
    });
  });

  it("should return corrected text from Bedrock Converse API", async () => {
    mockSend.mockResolvedValueOnce({
      output: {
        message: {
          content: [{ text: "I wanted to talk about the new feature." }],
        },
      },
    });

    const result = await provider.correct("so um I wanted to talk about the uh new feature");
    expect(result).toBe("I wanted to talk about the new feature.");
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it("should throw when response has no text content", async () => {
    mockSend.mockResolvedValueOnce({
      output: { message: { content: [] } },
    });

    await expect(provider.correct("test")).rejects.toThrow("LLM returned no text content");
  });

  it("should propagate SDK errors", async () => {
    mockSend.mockRejectedValueOnce(new Error("Access denied"));

    await expect(provider.correct("test")).rejects.toThrow("Access denied");
  });

  it("should use explicit credentials when provided", () => {
    new BedrockProvider({
      region: "eu-west-1",
      profile: "",
      accessKeyId: "AKID123",
      secretAccessKey: "secret456",
      modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
    });

    const lastCall = (BedrockRuntimeClient as unknown as ReturnType<typeof vi.fn>).mock.calls.at(-1)![0];
    expect(lastCall.region).toBe("eu-west-1");
    expect(lastCall.credentials.accessKeyId).toBe("AKID123");
    expect(lastCall.credentials.secretAccessKey).toBe("secret456");
  });

  it("should use named profile when provided without explicit keys", () => {
    new BedrockProvider({
      region: "us-west-2",
      profile: "my-profile",
      accessKeyId: "",
      secretAccessKey: "",
      modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
    });

    expect(mockFromIni).toHaveBeenCalledWith({ profile: "my-profile" });
    const lastCall = (BedrockRuntimeClient as unknown as ReturnType<typeof vi.fn>).mock.calls.at(-1)![0];
    expect(lastCall.credentials).toBe("ini-credentials");
  });

  it("should prefer explicit credentials over profile", () => {
    new BedrockProvider({
      region: "eu-west-1",
      profile: "my-profile",
      accessKeyId: "AKID123",
      secretAccessKey: "secret456",
      modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
    });

    expect(mockFromIni).not.toHaveBeenCalled();
    const lastCall = (BedrockRuntimeClient as unknown as ReturnType<typeof vi.fn>).mock.calls.at(-1)![0];
    expect(lastCall.credentials.accessKeyId).toBe("AKID123");
  });

  it("should not pass credentials when keys and profile are empty (default chain)", () => {
    new BedrockProvider({
      region: "us-east-1",
      profile: "",
      accessKeyId: "",
      secretAccessKey: "",
      modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
    });

    const lastCall = (BedrockRuntimeClient as unknown as ReturnType<typeof vi.fn>).mock.calls.at(-1)![0];
    expect(lastCall.region).toBe("us-east-1");
    expect(lastCall.credentials).toBeUndefined();
  });
});
