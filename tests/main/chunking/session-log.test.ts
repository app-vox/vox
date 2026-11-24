import { afterEach, describe, it, expect, vi } from "vitest";
import {
  audio,
  collectLog,
  deferred,
  fourChunks,
  newSession,
  quiet,
  scriptedWhisper,
  speech,
  threeChunks,
  type LogLine,
} from "../helpers/chunking";

const LOOP = "and then we will see, and then we will see, and then we will see, and then we will see";

/** 28 s with a cut at 400000 samples (25 s): the tail of 3 s is merged. */
const shortTail = () => audio(speech(24.86), quiet(0.6), speech(2.54));

/** The fields of the `Chunk` lines, in the order they were written. */
function chunkLines(lines: LogLine[]): Record<string, unknown>[] {
  return lines.filter((line) => line.level === "info" && line.message === "Chunk").map((line) => line.fields);
}

/** A reply that takes a second of the fake clock. */
function afterOneSecond(text: string): () => string {
  return () => {
    vi.advanceTimersByTime(1000);
    return text;
  };
}

describe("ChunkSession log", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("one log line per chunk", async () => {
    const whisper = scriptedWhisper(["Alpha one two.", "Thank you", "Gamma three four.", "Delta five six."]);
    const { log, lines } = collectLog();
    const session = newSession(whisper, { log, enhancing: () => true });
    const samples = fourChunks();
    expect(samples.length).toBe(1331200);

    session.append(samples.subarray(0, 1200000));
    await vi.waitFor(() => expect(session.joinedText()).toBe("Alpha one two. Gamma three four."));
    expect(whisper.calls).toHaveLength(3);
    session.append(samples.subarray(1200000));
    await session.finish();

    const chunks = chunkLines(lines);
    expect(lines.filter((line) => line.level === "info")).toHaveLength(4);
    expect(chunks).toHaveLength(4);
    for (const fields of chunks) {
      expect(Object.keys(fields).sort()).toEqual(
        ["index", "audioSeconds", "cut", "whisperMs", "language", "loop", "outcome", "retries", "whileRecording", "chars"].sort(),
      );
      expect(fields.whisperMs).toBeTypeOf("number");
      expect(fields.retries).toBe(0);
      expect(fields.loop).toBe(false);
      expect(fields.language).toBe("auto:none");
    }
    expect(chunks.map((fields) => fields.index)).toEqual([1, 2, 3, 4]);
    expect(chunks.map((fields) => fields.audioSeconds)).toEqual([21.14, 21.6, 20.04, 20.42]);
    expect(chunks.map((fields) => fields.cut)).toEqual(["pause", "pause", "max", "end"]);
    expect(chunks.map((fields) => fields.outcome)).toEqual(["ok", "dropped:hallucination", "ok", "ok"]);
    expect(chunks.map((fields) => fields.whileRecording)).toEqual([true, true, true, false]);
    expect(chunks.map((fields) => fields.chars)).toEqual([14, 0, 17, 15]);
  });

  it("failed chunk is logged", async () => {
    const whisper = scriptedWhisper(["Alpha one.", new Error("first boom"), new Error("second boom"), "Gamma three."]);
    const { log, lines } = collectLog();
    const session = newSession(whisper, { log });

    session.append(threeChunks());
    await session.finish();

    expect(lines.filter((line) => line.message === "Chunk pass failed")).toEqual([
      { level: "warn", message: "Chunk pass failed", fields: { index: 2, pass: 1, temperature: 0, error: "first boom" } },
      { level: "warn", message: "Chunk pass failed", fields: { index: 2, pass: 2, temperature: 0, error: "second boom" } },
    ]);
    const chunks = chunkLines(lines);
    expect(chunks).toHaveLength(3);
    expect(chunks[1].outcome).toBe("failed");
    expect(chunks[1].retries).toBe(1);
  });

  it("whisper milliseconds sum every pass of the chunk", async () => {
    vi.useFakeTimers({ toFake: ["performance"] });

    const retried = scriptedWhisper([afterOneSecond(LOOP), afterOneSecond("Clean text here.")]);
    const retriedLog = collectLog();
    const retriedSession = newSession(retried, { log: retriedLog.log });
    retriedSession.append(speech(3));
    await retriedSession.finish();

    expect(chunkLines(retriedLog.lines).map((fields) => fields.whisperMs)).toEqual([2000]);

    // The chunk the merge replaces had one finished pass, which the merged chunk's time keeps.
    const merged = scriptedWhisper([afterOneSecond("First draft."), afterOneSecond("Whole text.")]);
    const mergedLog = collectLog();
    const replacedDone = deferred<void>();
    const mergedSession = newSession(merged, { log: mergedLog.log, onChunkText: () => replacedDone.resolve() });
    mergedSession.append(shortTail());
    await replacedDone.promise;
    await mergedSession.finish();

    expect(merged.calls.map((call) => call.samples)).toEqual([400000, 448000]);
    expect(chunkLines(mergedLog.lines).map((fields) => fields.whisperMs)).toEqual([2000]);
  });

  it("the language field names what whisper reported after auto", async () => {
    const reporting = scriptedWhisper([{ text: "Olá, primeiro bloco.", language: "pt" }, "Segundo bloco.", "Terceiro bloco."]);
    const reportingLog = collectLog();
    const reportingSession = newSession(reporting, { log: reportingLog.log });
    reportingSession.append(threeChunks());
    await reportingSession.finish();

    expect(chunkLines(reportingLog.lines).map((fields) => fields.language)).toEqual(["auto:pt", "pt", "pt"]);

    const configured = scriptedWhisper(["Guten Morgen zusammen."]);
    const configuredLog = collectLog();
    const configuredSession = newSession(configured, { log: configuredLog.log, speechLanguages: ["de"] });
    configuredSession.append(speech(3));
    await configuredSession.finish();

    expect(chunkLines(configuredLog.lines).map((fields) => fields.language)).toEqual(["de"]);
  });

  it("a chunk whose text came from a pass after stop was not transcribed while recording", async () => {
    const loop = deferred<string>();
    const whisper = scriptedWhisper(["Alpha one.", loop.promise, "Beta two.", "Gamma three."]);
    const { log, lines } = collectLog();
    const session = newSession(whisper, { log });

    session.append(threeChunks());
    await vi.waitFor(() => expect(whisper.calls).toHaveLength(2));
    const finished = session.finish();
    loop.resolve(LOOP);
    const result = await finished;

    expect(result.text).toBe("Alpha one. Beta two. Gamma three.");
    expect(chunkLines(lines).map((fields) => fields.outcome)).toEqual(["ok", "retried", "ok"]);
    expect(chunkLines(lines).map((fields) => fields.whileRecording)).toEqual([true, false, false]);

    // A loop no retry broke is the text of its first pass, which here started before the stop.
    const firstLoop = deferred<string>();
    const surviving = scriptedWhisper([firstLoop.promise, LOOP, LOOP, "Beta two.", "Gamma three."]);
    const survivingLog = collectLog();
    const survivingSession = newSession(surviving, { log: survivingLog.log });

    survivingSession.append(threeChunks());
    expect(surviving.calls).toHaveLength(1);
    const survivingFinished = survivingSession.finish();
    firstLoop.resolve(LOOP);
    await survivingFinished;

    expect(surviving.calls).toHaveLength(5);
    expect(chunkLines(survivingLog.lines).map((fields) => fields.outcome)).toEqual(["collapsed", "ok", "ok"]);
    expect(chunkLines(survivingLog.lines).map((fields) => fields.whileRecording)).toEqual([true, false, false]);
  });

  it("the lines are written when the run has no text", async () => {
    const whisper = scriptedWhisper([""]);
    const { log, lines } = collectLog();
    const session = newSession(whisper, { log, enhancing: () => true });

    session.append(speech(3));
    const result = await session.finish();

    expect(result.text).toBe("");
    expect(chunkLines(lines)).toHaveLength(1);
    expect(chunkLines(lines)[0]).toMatchObject({ index: 1, audioSeconds: 3, cut: "end", outcome: "ok", chars: 0 });
  });

  it("an aborted pass writes no warn line", async () => {
    const whisper = scriptedWhisper(["hang", { text: "Whole text.", language: "en" }]);
    const { log, lines } = collectLog();
    const session = newSession(whisper, { log });

    session.append(shortTail());
    const result = await session.finish();

    expect(whisper.calls[0].signal?.aborted).toBe(true);
    expect(result.text).toBe("Whole text.");
    expect(lines.filter((line) => line.level === "warn")).toEqual([]);
    expect(chunkLines(lines)).toHaveLength(1);
  });
});
