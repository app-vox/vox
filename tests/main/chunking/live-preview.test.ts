import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TranscriptionResult } from "../../../src/main/audio/whisper";
import { LivePreview, cleanPreviewText } from "../../../src/main/chunking/live-preview";
import { RATE, collectLog, speech } from "../helpers/chunking";

interface Call {
  signal: AbortSignal;
  at: number;
  resolve(text: string): void;
  reject(error: Error): void;
  settled: boolean;
}

describe("LivePreview", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  /** A live pass of the test's own: every call stays pending until the test answers it. */
  function setup(audio: () => Float32Array = () => speech(6)) {
    const calls: Call[] = [];
    const texts: string[] = [];
    const logged = collectLog();
    const start = Date.now();
    const preview = new LivePreview({
      sampleRate: RATE,
      audio: () => audio(),
      transcribe: (_audio, signal) => {
        const answer = Promise.withResolvers<TranscriptionResult>();
        const call: Call = {
          signal,
          at: Date.now() - start,
          settled: false,
          resolve: (text) => answer.resolve({ text }),
          reject: answer.reject,
        };
        const promise = answer.promise.finally(() => {
          call.settled = true;
        });
        calls.push(call);
        return promise;
      },
      onText: (text) => texts.push(text),
      log: logged.log,
    });
    const end = async (): Promise<void> => {
      const stopping = preview.stop();
      for (const call of calls) call.resolve("");
      await stopping;
    };
    return { preview, calls, texts, logged, end };
  }

  it("the first pass runs after the given delay and each next one 1 s after the previous ended", async () => {
    const { preview, calls, texts, end } = setup();
    preview.start(400);

    await vi.advanceTimersByTimeAsync(399);
    expect(calls).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(calls).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(500);
    calls[0].resolve("Hello wor");
    await vi.advanceTimersByTimeAsync(0);
    expect(texts).toEqual(["Hello wor"]);

    await vi.advanceTimersByTimeAsync(999);
    expect(calls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(calls).toHaveLength(2);
    expect(calls[1].at).toBe(1900);
    await end();
  });

  it("a pass due with less than 0.5 s of audio is skipped and the next is due 1 s later", async () => {
    let audio = speech(0.4);
    const { preview, calls, end } = setup(() => audio);
    preview.start(400);

    await vi.advanceTimersByTimeAsync(400);
    expect(calls).toHaveLength(0);

    audio = speech(1);
    await vi.advanceTimersByTimeAsync(999);
    expect(calls).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(calls).toHaveLength(1);
    expect(calls[0].at).toBe(1400);
    await end();
  });

  it("stop aborts the pass in flight and ends the schedule", async () => {
    const { preview, calls, texts } = setup();
    preview.start(0);
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toHaveLength(1);

    let stopped = false;
    const stopping = preview.stop().then(() => {
      stopped = true;
    });
    expect(calls[0].signal.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(stopped).toBe(false);

    calls[0].resolve("Late text");
    await stopping;
    expect(calls[0].settled).toBe(true);
    expect(texts).toEqual([]);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(calls).toHaveLength(1);
  });

  it("start while an aborted pass is still ending waits for it", async () => {
    const { preview, calls, end } = setup();
    preview.start(0);
    await vi.advanceTimersByTimeAsync(0);
    void preview.stop();
    preview.start(0);

    await vi.advanceTimersByTimeAsync(5_000);
    expect(calls).toHaveLength(1);

    calls[0].resolve("");
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toHaveLength(2);
    expect(calls[1].at).toBe(5_000);
    await end();
  });

  it("a pass that throws is logged at debug and the next runs on schedule", async () => {
    const { preview, calls, logged, end } = setup();
    preview.start(0);
    await vi.advanceTimersByTimeAsync(0);
    calls[0].reject(new Error("whisper broke"));
    await vi.advanceTimersByTimeAsync(0);

    expect(logged.lines).toEqual([{ level: "debug", message: "Live pass failed", fields: { error: "whisper broke" } }]);
    await vi.advanceTimersByTimeAsync(999);
    expect(calls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(calls).toHaveLength(2);
    await end();
  });

  it("the text is cleaned as today's preview and garbage is not shown", async () => {
    expect(cleanPreviewText("[music] Hello  (laughs) there")).toBe("Hello there");
    expect(cleanPreviewText("Thank you")).toBeNull();
    expect(cleanPreviewText("[music]")).toBeNull();
    expect(cleanPreviewText("")).toBeNull();

    const { preview, calls, texts, end } = setup();
    preview.start(0);
    await vi.advanceTimersByTimeAsync(0);
    calls[0].resolve("Thank you");
    await vi.advanceTimersByTimeAsync(0);
    expect(texts).toEqual([]);
    await end();
  });
});
