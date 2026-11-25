import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChunkedRecording } from "../../../src/main/chunking/recording";
import { buildWhisperArgs, buildWhisperPrompt } from "../../../src/shared/constants";
import {
  FakeRecorder,
  deferred,
  scriptedWhisper,
  sessionOptions,
  speech,
  threeChunks,
  type Reply,
} from "../helpers/chunking";

const LOOP = "and then we will see, and then we will see, and then we will see, and then we will see";
const USUAL_PROMPT = buildWhisperPrompt([], buildWhisperArgs([]).promptPrefix);

describe("ChunkedRecording preview", () => {
  const recordings: ChunkedRecording[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    for (const recording of recordings.splice(0)) recording.abort();
    vi.useRealTimers();
  });

  function setup(replies: Reply[], options: { enhancing?: () => boolean; audio?: Float32Array } = {}) {
    const whisper = scriptedWhisper(replies);
    const shown: [string, string][] = [];
    const recording = new ChunkedRecording({
      ...sessionOptions(whisper, { enhancing: options.enhancing ?? (() => false) }),
      onPreviewText: (text, source) => shown.push([text, source]),
    });
    recordings.push(recording);
    const recorder = new FakeRecorder(options.audio ?? threeChunks());
    recording.startCapture(recorder);
    return { whisper, calls: whisper.calls, shown, recording, recorder };
  }

  it("live pass shows text before the first cut", async () => {
    const { calls, shown, recording, recorder } = setup(["Hello wor"]);
    recorder.recordUpTo(6);
    recording.setPreviewShown(true);
    await vi.advanceTimersByTimeAsync(1400);

    expect(calls).toHaveLength(1);
    expect(calls[0].samples).toBe(96000);
    expect(calls[0].prompt).toBe(USUAL_PROMPT);
    expect(calls[0].temperature).toBeUndefined();
    expect(shown).toEqual([["Hello wor", "live"]]);
  });

  it("first cut ends the live passes", async () => {
    const { calls, shown, recording, recorder } = setup(["Hello wor", "hang", "Alpha one.", "Beta two."]);
    recorder.recordUpTo(6);
    recording.setPreviewShown(true);
    await vi.advanceTimersByTimeAsync(2400);
    expect(calls).toHaveLength(2);

    recorder.recordUpTo(45);
    await vi.advanceTimersByTimeAsync(500);
    expect(calls[1].signal?.aborted).toBe(true);
    expect(calls[2].samples).toBe(338240);

    await vi.advanceTimersByTimeAsync(30_000);
    expect(calls).toHaveLength(4);
    expect(shown[0]).toEqual(["Hello wor", "live"]);
    expect(shown.filter(([, source]) => source === "live")).toHaveLength(1);
  });

  it("live text is not part of the transcript", async () => {
    const { shown, recording, recorder } = setup(["Hello wor", "Hello world, this is it."], { audio: speech(10) });
    recorder.recordUpTo(10);
    recording.setPreviewShown(true);
    await vi.advanceTimersByTimeAsync(1400);
    expect(shown).toEqual([["Hello wor", "live"]]);

    const result = await recording.finish(await recorder.stop());
    expect(result?.text).toBe("Hello world, this is it.");
  });

  it("hidden preview runs no live pass", async () => {
    const { calls, recorder } = setup([], { audio: speech(10) });
    recorder.recordUpTo(10);
    await vi.advanceTimersByTimeAsync(10_000);

    expect(calls).toHaveLength(0);
  });

  it("reopened preview resumes live passes", async () => {
    const { calls, shown, recording, recorder } = setup(["hang"], { audio: speech(10) });
    recorder.recordUpTo(8);
    await vi.advanceTimersByTimeAsync(500);
    recording.setPreviewShown(true);
    recording.setPreviewShown(false);
    await vi.advanceTimersByTimeAsync(2000);
    expect(calls).toHaveLength(0);

    recording.setPreviewShown(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(shown).toEqual([]);
    expect(calls).toHaveLength(1);
    expect(calls[0].samples).toBe(128000);
  });

  it("chunk texts replace the live text and grow", async () => {
    const { calls, shown, recording, recorder } = setup(["Hello wor", "Alpha one.", "Beta two."]);
    recorder.recordUpTo(6);
    recording.setPreviewShown(true);
    await vi.advanceTimersByTimeAsync(1400);
    recorder.recordUpTo(45);
    await vi.advanceTimersByTimeAsync(1500);

    expect(shown).toEqual([
      ["Hello wor", "live"],
      ["Alpha one.", "chunks"],
      ["Alpha one. Beta two.", "chunks"],
    ]);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(calls).toHaveLength(3);
  });

  it("looping first attempt does not reach the panel", async () => {
    const { shown, recording, recorder } = setup([LOOP, "Clean text here."]);
    recording.setPreviewShown(true);
    recorder.recordUpTo(22);
    await vi.advanceTimersByTimeAsync(1500);

    expect(shown.some(([text]) => text.includes("and then we will see"))).toBe(false);
    expect(shown.at(-1)).toEqual(["Clean text here.", "chunks"]);
  });

  it("hidden preview still transcribes", async () => {
    const { calls, shown, recorder } = setup(["Alpha one."]);
    recorder.recordUpTo(22);
    await vi.advanceTimersByTimeAsync(1000);

    expect(calls).toHaveLength(1);
    expect(shown).toEqual([]);
  });

  it("reopened preview shows the text so far", async () => {
    const { shown, recording, recorder } = setup(["Alpha one.", "Beta two."]);
    recorder.recordUpTo(45);
    await vi.advanceTimersByTimeAsync(2000);
    expect(shown).toEqual([]);

    recording.setPreviewShown(true);
    expect(shown).toEqual([["Alpha one. Beta two.", "chunks"]]);
  });

  it("the panel keeps the last live text until a chunk contributes text", async () => {
    const second = deferred<string>();
    const { shown, recording, recorder } = setup(["Hello wor", "Thank you", second.promise], {
      enhancing: () => true,
    });
    recorder.recordUpTo(6);
    recording.setPreviewShown(true);
    await vi.advanceTimersByTimeAsync(1400);
    recorder.recordUpTo(45);
    await vi.advanceTimersByTimeAsync(1500);
    expect(shown).toEqual([["Hello wor", "live"]]);

    second.resolve("Beta two.");
    await vi.advanceTimersByTimeAsync(0);
    expect(shown).toEqual([
      ["Hello wor", "live"],
      ["Beta two.", "chunks"],
    ]);
  });

  it("reopened after the first cut and before a chunk text is final the panel gets nothing until then", async () => {
    const first = deferred<string>();
    const { shown, recording, recorder } = setup([first.promise]);
    recorder.recordUpTo(22);
    await vi.advanceTimersByTimeAsync(1000);
    recording.setPreviewShown(true);
    expect(shown).toEqual([]);

    first.resolve("Alpha one.");
    await vi.advanceTimersByTimeAsync(0);
    expect(shown).toEqual([["Alpha one.", "chunks"]]);
  });

  it("closing the preview aborts the live pass in flight", async () => {
    const { calls, recording, recorder } = setup(["hang"]);
    recorder.recordUpTo(6);
    recording.setPreviewShown(true);
    await vi.advanceTimersByTimeAsync(1400);
    expect(calls[0].signal?.aborted).toBe(false);

    recording.setPreviewShown(false);
    expect(calls[0].signal?.aborted).toBe(true);
  });

  it("the first cancel aborts the live pass and nothing reaches the panel until the undo", async () => {
    const { calls, shown, recording, recorder } = setup(["hang"]);
    recorder.recordUpTo(6);
    recording.setPreviewShown(true);
    await vi.advanceTimersByTimeAsync(1400);

    recording.pause();
    expect(calls[0].signal?.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(5000);
    recording.resume();
    expect(shown).toEqual([]);
  });

  it("a chunk pass that ends during the pause reaches the panel on resume", async () => {
    const first = deferred<string>();
    const { shown, recording, recorder } = setup([first.promise]);
    recording.setPreviewShown(true);
    recorder.recordUpTo(22);
    await vi.advanceTimersByTimeAsync(1000);

    recording.pause();
    first.resolve("Alpha one.");
    await vi.advanceTimersByTimeAsync(0);
    expect(shown).toEqual([]);

    recording.resume();
    expect(shown).toEqual([["Alpha one.", "chunks"]]);
  });

  it("a live pass's language is never pinned", async () => {
    const { calls, recording, recorder } = setup([{ text: "Hello wor", language: "en" }, "Alpha one."]);
    recorder.recordUpTo(6);
    recording.setPreviewShown(true);
    await vi.advanceTimersByTimeAsync(1400);
    recorder.recordUpTo(22);
    await vi.advanceTimersByTimeAsync(1000);

    expect(calls[0].language).toBe("auto");
    expect(calls[1].language).toBe("auto");
  });

  it("live passes do not count toward a chunk's three passes", async () => {
    const { calls, recording, recorder } = setup(["Hello wor", "Hello again", LOOP, LOOP, LOOP]);
    recorder.recordUpTo(6);
    recording.setPreviewShown(true);
    await vi.advanceTimersByTimeAsync(2400);
    recorder.recordUpTo(22);
    await vi.advanceTimersByTimeAsync(2000);

    expect(calls).toHaveLength(5);
  });

  it("the first chunk pass starts only after the aborted live pass has ended", async () => {
    const late = deferred<string>();
    const { calls, shown, recording, recorder } = setup([late.promise, "Alpha one."]);
    recorder.recordUpTo(6);
    recording.setPreviewShown(true);
    await vi.advanceTimersByTimeAsync(1400);
    recorder.recordUpTo(22);
    await vi.advanceTimersByTimeAsync(1000);
    expect(calls).toHaveLength(1);
    expect(calls[0].signal?.aborted).toBe(true);

    late.resolve("Late text");
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toHaveLength(2);
    expect(shown.some(([text]) => text === "Late text")).toBe(false);
  });
});
