import { describe, it, expect } from "vitest";
import { collectLog, deferred, newSession, scriptedWhisper, speech, threeChunks } from "../helpers/chunking";

/** Lets every promise that is already settled run its continuations. */
async function flush(): Promise<void> {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

describe("ChunkSession cancel window", () => {
  it("cancel window starts no new pass", async () => {
    const first = deferred<string>();
    const whisper = scriptedWhisper([first.promise, "Beta two.", "Gamma three."]);
    const session = newSession(whisper);

    session.append(threeChunks());
    expect(whisper.calls).toHaveLength(1);
    session.pause();
    expect(whisper.calls[0].signal?.aborted).toBe(false);

    const waiting = session.finish();
    first.resolve("Alpha one.");
    await flush();

    expect(whisper.calls).toHaveLength(1);
    expect(await waiting).toBeNull();
    expect(await session.finish()).toBeNull();
  });

  it("an undone cancel goes on with what is missing", async () => {
    const first = deferred<string>();
    const whisper = scriptedWhisper([first.promise, "Beta two.", "Gamma three."]);
    const session = newSession(whisper);

    session.append(threeChunks());
    session.pause();
    first.resolve("Alpha one.");
    await flush();
    expect(await session.finish()).toBeNull();

    session.resume();
    const result = await session.finish();

    expect(whisper.calls).toHaveLength(3);
    expect(result?.text).toBe("Alpha one. Beta two. Gamma three.");
    expect(whisper.calls.map((call) => call.samples)).toEqual([338240, 345600, 135360]);
  });

  it("confirmed cancel aborts the pass in flight", async () => {
    const whisper = scriptedWhisper(["hang", "Beta two.", "Gamma three."]);
    const { log, lines } = collectLog();
    const session = newSession(whisper, { log });

    session.append(threeChunks());
    session.pause();
    session.abort();
    await flush();

    expect(whisper.calls[0].signal?.aborted).toBe(true);
    expect(await session.finish()).toBeNull();
    expect(session.joinedText()).toBe("");
    expect(whisper.calls).toHaveLength(1);
    expect(lines.filter((line) => line.level === "warn")).toEqual([]);
  });

  it("an aborted session writes no warn line", async () => {
    const whisper = scriptedWhisper(["hang"]);
    const { log, lines } = collectLog();
    const session = newSession(whisper, { log });

    session.append(threeChunks());
    const waiting = session.finish();
    session.abort();

    expect(await waiting).toBeNull();
    expect(lines.filter((line) => line.level === "warn")).toEqual([]);
  });

  it("a session that is aborted ignores later samples", async () => {
    const whisper = scriptedWhisper(["hang", "Beta two."]);
    const session = newSession(whisper);

    session.append(threeChunks());
    session.abort();
    await flush();
    const samples = session.sampleCount;
    session.append(speech(40));
    await flush();

    expect(whisper.calls).toHaveLength(1);
    expect(session.joinedText()).toBe("");
    expect(session.sampleCount).toBe(samples);
  });

  it("a session that is paused or finished ignores later samples", async () => {
    const whisper = scriptedWhisper(["Alpha one.", "Beta two.", "Gamma three."]);
    const session = newSession(whisper);

    session.append(threeChunks());
    session.pause();
    const samples = session.sampleCount;
    session.append(speech(40));
    expect(session.sampleCount).toBe(samples);

    session.resume();
    await session.finish();
    session.append(speech(40));
    expect(session.sampleCount).toBe(samples);
  });
});
