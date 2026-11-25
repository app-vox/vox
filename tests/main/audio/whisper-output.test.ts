import { describe, it, expect } from "vitest";
import { parseDetectedLanguage, parseWhisperOutput, passLanguage } from "../../../src/main/audio/whisper-output";

const LANGUAGE_LINE = "whisper_full_with_state: auto-detected language: pt (p = 0.980138)";
const TEXT_LINE = "[00:00:00.000 --> 00:00:03.000]   Testando para ver se funciona";

describe("whisper-cli output", () => {
  it("language is read from whisper-cli's output", () => {
    expect(parseDetectedLanguage(LANGUAGE_LINE)).toBe("pt");

    const surrounded = [
      "whisper_init_state: compute buffer (decode) = 98.19 MB",
      "",
      LANGUAGE_LINE,
      "",
      "whisper_print_timings: total time = 1200.00 ms",
      "",
      TEXT_LINE,
    ].join("\n");
    expect(parseDetectedLanguage(surrounded)).toBe("pt");
  });

  it("output without the line reports no language", () => {
    const output = ["whisper_print_timings: total time = 1200.00 ms", "", TEXT_LINE].join("\n");
    expect(parseDetectedLanguage(output)).toBeNull();
    expect(parseDetectedLanguage("")).toBeNull();
  });

  it("the text lines are read as before", () => {
    expect(parseWhisperOutput(TEXT_LINE)).toBe("Testando para ver se funciona");
  });

  it("a pass in a resolved language ran in it, whatever the output reports", () => {
    expect(passLanguage("de", LANGUAGE_LINE)).toBe("de");
  });

  it("a pass with auto ran in the reported language", () => {
    expect(passLanguage("auto", LANGUAGE_LINE)).toBe("pt");
  });

  it("a pass with auto and no reported language ran in none", () => {
    expect(passLanguage("auto", TEXT_LINE)).toBeUndefined();
  });
});
