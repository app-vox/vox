import { describe, it, expect } from "vitest";
import { carriedText, passSettings } from "../../../src/main/chunking/prompt";
import { WHISPER_PROMPT, buildWhisperArgs, buildWhisperPrompt } from "../../../src/shared/constants";
import { text300, text80, tokens } from "../helpers/chunking";

describe("carriedText", () => {
  it("a long text is carried from a word start", () => {
    expect(tokens).toHaveLength(503);

    const carried = carriedText(tokens);

    expect(carried).toBe(tokens.slice(tokens.indexOf("token034")));
    expect(carried).toHaveLength(197);
  });

  it("a window that starts at a word keeps that word", () => {
    expect(text300).toHaveLength(300);

    const carried = carriedText(text300);

    expect(carried).toBe(text300.slice(100));
    expect(carried).toHaveLength(200);
    expect(carried.startsWith("w020 ")).toBe(true);
  });

  it("a short text is carried whole", () => {
    expect(text80).toHaveLength(80);

    expect(carriedText(text80)).toBe(text80);
  });

  it("a word longer than the window is carried as its last 200 characters", () => {
    expect(carriedText("x".repeat(250))).toBe("x".repeat(200));
  });

  it("an empty text carries nothing", () => {
    expect(carriedText("")).toBe("");
  });
});

describe("passSettings", () => {
  it("pass settings by retry", () => {
    const input = {
      dictionary: ["Kubernetes"],
      speechLanguages: ["pt", "en"],
      pinnedLanguage: "pt",
      carried: "last words",
    };
    const prefix = buildWhisperArgs(["pt", "en"]).promptPrefix;
    const usual = buildWhisperPrompt(["Kubernetes"], prefix, "last words");
    expect(prefix).not.toBe("");

    expect(passSettings({ ...input, retry: 0 })).toEqual({ prompt: usual, language: "pt", bare: false });
    expect(passSettings({ ...input, retry: 1 })).toEqual({ prompt: usual, language: "pt", temperature: 0.4, bare: false });
    expect(passSettings({ ...input, retry: 2 })).toEqual({
      prompt: WHISPER_PROMPT,
      language: "pt",
      temperature: 0.8,
      bare: true,
    });

    const retries = [0, 1, 2] as const;
    expect(retries.map((retry) => passSettings({ ...input, speechLanguages: ["de"], retry }).language)).toEqual([
      "de",
      "de",
      "de",
    ]);
    expect(
      retries.map((retry) => passSettings({ ...input, speechLanguages: [], pinnedLanguage: null, retry }).language),
    ).toEqual(["auto", "auto", "auto"]);
  });
});
