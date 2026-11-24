import { describe, it, expect } from "vitest";
import { WHISPER_PROMPT } from "../../../src/shared/constants";
import { audio, newSession, quiet, scriptedWhisper, speech, threeChunks } from "../helpers/chunking";

const LOOP = "and then we will see, and then we will see, and then we will see, and then we will see";

describe("ChunkSession loop retries", () => {
  it("retry breaks the loop", async () => {
    const whisper = scriptedWhisper(["Alpha one.", LOOP, "Beta two.", "Gamma three."]);
    const session = newSession(whisper);

    session.append(threeChunks());
    const result = await session.finish();

    expect(result.text).toBe("Alpha one. Beta two. Gamma three.");
    expect(whisper.calls.map((call) => call.temperature)).toEqual([undefined, undefined, 0.4, undefined]);
    expect(whisper.calls.map((call) => call.samples)).toEqual([338240, 345600, 345600, 135360]);
    expect(result.incomplete).toBe(false);
    expect(result.chunks.map((chunk) => chunk.outcome)).toEqual(["ok", "retried", "ok"]);
    expect(result.chunks.map((chunk) => chunk.loop)).toEqual([false, true, false]);
    expect(result.chunks.map((chunk) => chunk.retries)).toEqual([0, 1, 0]);
    expect(result.chunks[1].passes.map(({ temperature, bare, result: passResult }) => ({ temperature, bare, passResult }))).toEqual([
      { temperature: undefined, bare: false, passResult: "loop" },
      { temperature: 0.4, bare: false, passResult: "text" },
    ]);
    expect(result.chunks[1].chars).toBe(9);
  });

  it("last retry runs without dictionary, language prefix and carried text", async () => {
    const whisper = scriptedWhisper([
      { text: "Olá, este é o primeiro bloco.", language: "pt" },
      LOOP,
      LOOP,
      "Segundo bloco aqui.",
      "Terceiro bloco aqui.",
    ]);
    const session = newSession(whisper, { dictionary: ["Kubernetes"], speechLanguages: ["pt", "en"] });

    session.append(threeChunks());
    const result = await session.finish();

    const [, second, third, fourth] = whisper.calls;
    expect(second.prompt).toContain("Kubernetes");
    expect(second.prompt.startsWith("The speaker may use:")).toBe(true);
    expect(second.prompt.endsWith(`${WHISPER_PROMPT} Olá, este é o primeiro bloco.`)).toBe(true);
    expect(third.temperature).toBe(0.4);
    expect(third.prompt).toBe(second.prompt);
    expect(fourth.temperature).toBe(0.8);
    expect(fourth.prompt).toBe(WHISPER_PROMPT);
    expect(fourth.language).toBe("pt");
    expect(result.text).toBe("Olá, este é o primeiro bloco. Segundo bloco aqui. Terceiro bloco aqui.");
    expect(result.chunks[1].retries).toBe(2);
    expect(result.chunks[1].passes.map((pass) => pass.bare)).toEqual([false, false, true]);
  });

  it("last retry keeps a configured single language", async () => {
    const whisper = scriptedWhisper([LOOP, LOOP, "Guten Morgen zusammen."]);
    const session = newSession(whisper, { speechLanguages: ["de"] });

    session.append(speech(3));
    const result = await session.finish();

    expect(whisper.calls[2].language).toBe("de");
    expect(whisper.calls[2].temperature).toBe(0.8);
    expect(result.text).toBe("Guten Morgen zusammen.");
  });

  it("surviving loop is collapsed and pasted", async () => {
    const whisper = scriptedWhisper(["Alpha one.", LOOP, LOOP, LOOP, "Gamma three."]);
    const session = newSession(whisper, { enhancing: () => true });

    session.append(threeChunks());
    const result = await session.finish();

    expect(result.text).toBe("Alpha one. and then we will see, Gamma three.");
    expect(result.incomplete).toBe(true);
    expect(result.chunks[1].outcome).toBe("collapsed");
    expect(result.chunks[1].loop).toBe(true);
    expect(result.chunks[1].retries).toBe(2);
    expect(whisper.calls).toHaveLength(5);
  });

  it("nothing is carried from a surviving loop", async () => {
    const whisper = scriptedWhisper(["Alpha one.", LOOP, LOOP, LOOP, "Gamma three."]);
    const session = newSession(whisper, { enhancing: () => true });

    session.append(threeChunks());
    await session.finish();

    expect(whisper.calls[1].prompt).toBe(`${WHISPER_PROMPT} Alpha one.`);
    expect(whisper.calls[4].prompt).toBe(WHISPER_PROMPT);
  });

  it("a retry text rejected for another reason does not break the loop with enhancement on", async () => {
    const whisper = scriptedWhisper([LOOP, "Thank you", "Clean text here."]);
    const session = newSession(whisper, { enhancing: () => true });

    session.append(speech(3));
    const result = await session.finish();

    expect(whisper.calls[2].temperature).toBe(0.8);
    expect(result.text).toBe("Clean text here.");
    expect(result.chunks[0].passes.map((pass) => pass.result)).toEqual(["loop", "rejected", "text"]);
  });

  it("a retry text without a loop breaks the loop with enhancement off", async () => {
    const whisper = scriptedWhisper([LOOP, "Um"]);
    const session = newSession(whisper, { enhancing: () => false });

    session.append(speech(3));
    const result = await session.finish();

    expect(whisper.calls).toHaveLength(2);
    expect(result.text).toBe("Um");
  });

  it("an empty retry text does not break the loop", async () => {
    const whisper = scriptedWhisper([LOOP, "", "Clean text here."]);
    const session = newSession(whisper);

    session.append(speech(3));
    const result = await session.finish();

    expect(whisper.calls).toHaveLength(3);
    expect(result.text).toBe("Clean text here.");
    expect(result.chunks[0].passes.map((pass) => pass.result)).toEqual(["loop", "empty", "text"]);
  });

  it("a merged chunk gets its own three passes", async () => {
    const whisper = scriptedWhisper(["hang", LOOP, LOOP, LOOP]);
    const session = newSession(whisper);

    // 28 s with a cut at 400000 samples (25 s): the tail of 3 s is merged.
    session.append(audio(speech(24.86), quiet(0.6), speech(2.54)));
    const result = await session.finish();

    expect(whisper.calls.map((call) => call.samples)).toEqual([400000, 448000, 448000, 448000]);
    expect(whisper.calls.map((call) => call.temperature)).toEqual([undefined, undefined, 0.4, 0.8]);
    expect(result.text).toBe("and then we will see,");
    expect(result.chunks[0].outcome).toBe("collapsed");
    expect(result.chunks[0].retries).toBe(2);
    expect(result.chunks[0].passes.map((pass) => pass.result)).toEqual(["aborted", "loop", "loop", "loop"]);
  });

  it("enhancement is asked about once, when the first pass starts", async () => {
    const whisper = scriptedWhisper(["Alpha one.", "Beta two.", "Gamma three."]);
    let asked = 0;
    const session = newSession(whisper, {
      enhancing: () => {
        asked++;
        return true;
      },
    });

    expect(asked).toBe(0);
    session.append(threeChunks());
    await session.finish();

    expect(asked).toBe(1);
  });
});
