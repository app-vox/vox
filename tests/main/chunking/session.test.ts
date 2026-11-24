import { describe, it, expect, vi } from "vitest";
import { buildWhisperPrompt } from "../../../src/shared/constants";
import { audio, deferred, newSession, scriptedWhisper, speech, threeChunks } from "../helpers/chunking";

const THREE_TEXTS = ["Alpha one.", "Beta two.", "Gamma three."];
const THREE_JOINED = "Alpha one. Beta two. Gamma three.";
const THREE_SAMPLES = [338240, 345600, 135360];

describe("ChunkSession", () => {
  it("transcript joins the chunk texts", async () => {
    const whisper = scriptedWhisper(THREE_TEXTS);
    const session = newSession(whisper);

    session.append(threeChunks());
    const result = await session.finish();

    expect(result.text).toBe(THREE_JOINED);
    expect(result.chunks.map((chunk) => chunk.cut)).toEqual(["pause", "pause", "end"]);
    expect(result.chunks.map((chunk) => chunk.index)).toEqual([1, 2, 3]);
    expect(result.chunks.map((chunk) => chunk.audioSeconds)).toEqual([21.14, 21.6, 8.46]);
    expect(result.chunks.map((chunk) => chunk.chars)).toEqual([10, 9, 12]);
    expect(result.whisperMs).toBe(result.chunks.reduce((sum, chunk) => sum + chunk.whisperMs, 0));
    expect(whisper.calls.map((call) => call.samples)).toEqual(THREE_SAMPLES);
    expect(whisper.calls.map((call) => call.sampleRate)).toEqual([16000, 16000, 16000]);
    expect(session.sampleCount).toBe(819200);
    expect(session.cutCount).toBe(2);
  });

  it("closed chunks are not transcribed again after stop", async () => {
    const whisper = scriptedWhisper(THREE_TEXTS);
    const session = newSession(whisper);
    const samples = threeChunks();

    session.append(samples.subarray(0, 720000));
    await vi.waitFor(() => expect(whisper.calls).toHaveLength(2));
    session.append(samples.subarray(720000));
    await session.finish();

    expect(whisper.calls).toHaveLength(3);
    expect(whisper.calls[2].samples).toBe(135360);
    expect(whisper.calls.reduce((sum, call) => sum + call.samples, 0)).toBe(819200);
  });

  it("one whisper process at a time", async () => {
    const first = deferred<string>();
    const whisper = scriptedWhisper([first.promise, "Beta two.", "Gamma three."]);
    const session = newSession(whisper);

    session.append(threeChunks());
    expect(session.cutCount).toBe(2);
    expect(whisper.calls).toHaveLength(1);

    first.resolve("Alpha one.");
    await vi.waitFor(() => expect(whisper.calls).toHaveLength(2));
  });

  it("stop waits for the pass in flight", async () => {
    const first = deferred<string>();
    const whisper = scriptedWhisper([first.promise, "Beta two.", "Gamma three."]);
    const session = newSession(whisper);
    const samples = threeChunks();

    session.append(samples.subarray(0, 720000));
    session.append(samples.subarray(720000));
    const finished = session.finish();

    expect(whisper.calls).toHaveLength(1);
    expect(whisper.calls[0].signal?.aborted).toBe(false);

    first.resolve("Alpha one.");
    const result = await finished;

    expect(whisper.calls[0].signal?.aborted).toBe(false);
    expect(result.text).toBe(THREE_JOINED);
    expect(whisper.calls.map((call) => call.samples)).toEqual(THREE_SAMPLES);
  });

  it("each pass gets the usual prompt and the configured language", async () => {
    const whisper = scriptedWhisper(THREE_TEXTS);
    const session = newSession(whisper, { dictionary: ["Kubernetes"], speechLanguages: ["de"] });

    session.append(threeChunks());
    await session.finish();

    expect(whisper.calls).toHaveLength(3);
    for (const call of whisper.calls) {
      expect(call.prompt).toBe(buildWhisperPrompt(["Kubernetes"], ""));
      expect(call.language).toBe("de");
      expect(call.temperature).toBeUndefined();
    }
  });

  it("onChunkText gets the joined texts as each chunk's text is final", async () => {
    const whisper = scriptedWhisper(THREE_TEXTS);
    const joined: string[] = [];
    const session = newSession(whisper, { onChunkText: (text) => joined.push(text) });

    session.append(threeChunks());
    await session.finish();

    expect(joined).toEqual(["Alpha one.", "Alpha one. Beta two.", THREE_JOINED]);
    expect(session.joinedText()).toBe(THREE_JOINED);
  });

  it("the samples after the last whole frame belong to the last chunk", async () => {
    const whisper = scriptedWhisper(["Short."]);
    const session = newSession(whisper);

    session.append(audio(speech(3), speech(100 / 16000)));
    await session.finish();

    expect(whisper.calls.map((call) => call.samples)).toEqual([48100]);
  });

  it("finish called again resolves the same result and runs no pass", async () => {
    const whisper = scriptedWhisper(THREE_TEXTS);
    const session = newSession(whisper);

    session.append(threeChunks());
    const result = await session.finish();

    expect(await session.finish()).toBe(result);
    expect(whisper.calls).toHaveLength(3);
  });
});
