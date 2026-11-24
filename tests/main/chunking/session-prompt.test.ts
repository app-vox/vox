import { describe, it, expect, vi } from "vitest";
import { WHISPER_PROMPT, WHISPER_PROMPT_MAX_CHARS } from "../../../src/shared/constants";
import {
  audio,
  collectLog,
  newSession,
  quiet,
  scriptedWhisper,
  speech,
  text300,
  text80,
  threeChunks,
  tokens,
  words,
} from "../helpers/chunking";

const FIRST_TEXT = "Olá, este é o primeiro bloco.";
const FIRST_IN_PT = { text: FIRST_TEXT, language: "pt" };

describe("ChunkSession language", () => {
  it("detected language is used for later chunks", async () => {
    const whisper = scriptedWhisper([FIRST_IN_PT, "Segundo bloco aqui.", "Terceiro bloco aqui."]);
    const { log, lines } = collectLog();
    const session = newSession(whisper, { log });

    session.append(threeChunks());
    await session.finish();

    expect(whisper.calls.map((call) => call.language)).toEqual(["auto", "pt", "pt"]);
    expect(lines).toEqual([]);
  });

  it("no language reported keeps auto", async () => {
    const whisper = scriptedWhisper([FIRST_TEXT, "Segundo bloco aqui.", "Terceiro bloco aqui."]);
    const { log, lines } = collectLog();
    const session = newSession(whisper, { log });

    session.append(threeChunks());
    await session.finish();

    expect(whisper.calls.map((call) => call.language)).toEqual(["auto", "auto", "auto"]);
    expect(lines).toEqual([
      { level: "warn", message: "Chunk reported no language", fields: { index: 1 } },
      { level: "warn", message: "Chunk reported no language", fields: { index: 2 } },
      { level: "warn", message: "Chunk reported no language", fields: { index: 3 } },
    ]);
  });

  it("a chunk whose first pass and merged pass report no language is warned about once", async () => {
    const whisper = scriptedWhisper([FIRST_TEXT, "Rascunho do segundo.", "Segundo bloco inteiro."]);
    const { log, lines } = collectLog();
    const session = newSession(whisper, { log });

    session.append(audio(speech(21), quiet(0.6), speech(24.26), quiet(0.6), speech(2.54)));
    await vi.waitFor(() => expect(session.joinedText()).toBe(`${FIRST_TEXT} Rascunho do segundo.`));
    await session.finish();

    expect(whisper.calls).toHaveLength(3);
    expect(lines.map((line) => line.fields)).toEqual([{ index: 1 }, { index: 2 }]);
  });

  it("configured single language is used for every chunk", async () => {
    const whisper = scriptedWhisper([FIRST_TEXT, "Segundo bloco aqui.", "Terceiro bloco aqui."]);
    const { log, lines } = collectLog();
    const session = newSession(whisper, { speechLanguages: ["de"], log });

    session.append(threeChunks());
    await session.finish();

    expect(whisper.calls.map((call) => call.language)).toEqual(["de", "de", "de"]);
    expect(lines).toEqual([]);
  });

  it("several configured languages keep their prefix after the language is pinned", async () => {
    const whisper = scriptedWhisper([FIRST_IN_PT, "Segundo bloco aqui.", "Terceiro bloco aqui."]);
    const session = newSession(whisper, { speechLanguages: ["pt", "en"] });

    session.append(threeChunks());
    await session.finish();

    expect(whisper.calls.map((call) => call.language)).toEqual(["auto", "pt", "pt"]);
    expect(whisper.calls[1].prompt.startsWith("The speaker may use:")).toBe(true);
    expect(whisper.calls[1].prompt.endsWith(`${WHISPER_PROMPT} ${FIRST_TEXT}`)).toBe(true);
  });
});

describe("ChunkSession carried text", () => {
  it("long text is carried from a word start", async () => {
    const whisper = scriptedWhisper([tokens, "Segundo bloco aqui.", "Terceiro bloco aqui."]);
    const session = newSession(whisper);

    session.append(threeChunks());
    await session.finish();

    const carried = tokens.slice(tokens.indexOf("token034"));
    expect(carried.endsWith("token055")).toBe(true);
    expect(whisper.calls[0].prompt).toBe(WHISPER_PROMPT);
    expect(whisper.calls[1].prompt).toBe(`${WHISPER_PROMPT} ${carried}`);
  });

  it("short text is carried whole", async () => {
    const whisper = scriptedWhisper([text80, "Segundo bloco aqui.", "Terceiro bloco aqui."]);
    const session = newSession(whisper);

    session.append(threeChunks());
    await session.finish();

    expect(whisper.calls[1].prompt).toBe(`${WHISPER_PROMPT} ${text80}`);
  });

  it("dictionary shrinks to make room", async () => {
    const terms = words("term", 120).split(" ");
    const whisper = scriptedWhisper([text300, "Segundo bloco aqui.", "Terceiro bloco aqui."]);
    const session = newSession(whisper, { dictionary: terms });

    session.append(threeChunks());
    await session.finish();

    const [first, second] = whisper.calls.map((call) => call.prompt);
    const termsOf = (prompt: string) => prompt.slice(0, prompt.indexOf(`. ${WHISPER_PROMPT}`)).split(", ");
    expect(first.length).toBeLessThanOrEqual(WHISPER_PROMPT_MAX_CHARS);
    expect(second.length).toBeLessThanOrEqual(WHISPER_PROMPT_MAX_CHARS);
    expect(second.endsWith(`. ${WHISPER_PROMPT} ${text300.slice(100)}`)).toBe(true);
    const kept = termsOf(second);
    expect(kept).toEqual(terms.slice(0, kept.length));
    expect(kept.length).toBeGreaterThan(0);
    expect(kept.length).toBeLessThan(termsOf(first).length);
  });

  it("nothing is carried from a chunk without text", async () => {
    const whisper = scriptedWhisper([FIRST_TEXT, "", "Terceiro bloco aqui."]);
    const session = newSession(whisper);

    session.append(threeChunks());
    await session.finish();

    expect(whisper.calls[1].prompt).toBe(`${WHISPER_PROMPT} ${FIRST_TEXT}`);
    expect(whisper.calls[2].prompt).toBe(WHISPER_PROMPT);
  });

  it("a merged chunk runs with the pinned language and the text of the chunk before it", async () => {
    const whisper = scriptedWhisper([FIRST_IN_PT, "Rascunho do segundo.", "Segundo bloco inteiro."]);
    const session = newSession(whisper);

    // A first chunk, then the recording of the tail merge: a cut 25 s into it and a tail of 3 s.
    session.append(audio(speech(21), quiet(0.6), speech(24.26), quiet(0.6), speech(2.54)));
    await vi.waitFor(() => expect(session.joinedText()).toBe(`${FIRST_TEXT} Rascunho do segundo.`));
    const result = await session.finish();

    expect(whisper.calls.map((call) => call.samples)).toEqual([338240, 397760, 445760]);
    expect(whisper.calls[2].language).toBe("pt");
    expect(whisper.calls[2].prompt).toBe(`${WHISPER_PROMPT} ${FIRST_TEXT}`);
    expect(result.text).toBe(`${FIRST_TEXT} Segundo bloco inteiro.`);
  });
});
