import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChunkedRecording } from "../../../src/main/chunking/recording";
import {
  FakeRecorder,
  RATE,
  collectLog,
  deferred,
  scriptedWhisper,
  sessionOptions,
  threeChunks,
} from "../helpers/chunking";

const STEP = 500;

describe("ChunkedRecording capture", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(replies: string[] = ["Alpha one.", "Beta two.", "Gamma three."]) {
    const whisper = scriptedWhisper(replies);
    const logged = collectLog();
    const recording = new ChunkedRecording(sessionOptions(whisper, { log: logged.log }));
    const recorder = new FakeRecorder(threeChunks());
    return { whisper, logged, recording, recorder };
  }

  it("only new audio is fetched", async () => {
    const { recording, recorder } = setup();
    recording.startCapture(recorder);

    recorder.recordUpTo(2);
    await vi.advanceTimersByTimeAsync(STEP);
    recorder.recordUpTo(2.5);
    await vi.advanceTimersByTimeAsync(STEP);

    expect(recorder.fetches).toEqual([
      { offset: 0, returned: 32000 },
      { offset: 32000, returned: 8000 },
    ]);
  });

  it("no fetch after the recording ends", async () => {
    for (const end of ["endCapture", "abort"] as const) {
      const { recording, recorder } = setup();
      recording.startCapture(recorder);
      recorder.recordUpTo(1);
      await vi.advanceTimersByTimeAsync(STEP);
      await recording[end]();
      const fetched = recorder.fetches.length;

      await vi.advanceTimersByTimeAsync(STEP);
      await vi.advanceTimersByTimeAsync(5000);

      expect(fetched).toBe(1);
      expect(recorder.fetches).toHaveLength(fetched);
    }
  });

  it("a failed fetch asks again from the same offset and writes a warn line", async () => {
    const { recording, recorder, logged } = setup();
    recording.startCapture(recorder);
    recorder.recordUpTo(2);
    recorder.failNextFetch(new Error("window gone"));

    await vi.advanceTimersByTimeAsync(STEP);
    await vi.advanceTimersByTimeAsync(STEP);

    expect(recorder.fetches.map((fetch) => fetch.offset)).toEqual([0, 0]);
    expect(logged.lines.filter((line) => line.level === "warn")).toEqual([
      { level: "warn", message: "Audio fetch failed", fields: { offset: 0, error: "window gone" } },
    ]);
  });

  it("a fetch that resolves after the capture ended is dropped", async () => {
    const { whisper, recording } = setup();
    const full = threeChunks();
    const late = deferred<Float32Array>();
    recording.startCapture({ samplesFrom: () => late.promise });

    await vi.advanceTimersByTimeAsync(STEP);
    await recording.endCapture();
    const finished = recording.finish({ audioBuffer: full, sampleRate: RATE });
    late.resolve(full.subarray(0, 32000));
    const result = await finished;

    expect(result?.text).toBe("Alpha one. Beta two. Gamma three.");
    expect(whisper.calls.reduce((sum, call) => sum + call.samples, 0)).toBe(full.length);
  });

  it("finish appends the samples not fetched yet", async () => {
    const { whisper, recording, recorder } = setup();
    recording.startCapture(recorder);

    recorder.recordUpTo(45);
    await vi.advanceTimersByTimeAsync(STEP);
    expect(whisper.calls).toHaveLength(2);
    recorder.recordUpTo(51.2);
    const result = await recording.finish(await recorder.stop());

    expect(result?.text).toBe("Alpha one. Beta two. Gamma three.");
    expect(whisper.calls.map((call) => call.samples)).toEqual([338240, 345600, 135360]);
  });
});
