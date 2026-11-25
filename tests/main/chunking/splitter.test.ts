import { describe, it, expect } from "vitest";
import { ChunkSplitter, type Cut } from "../../../src/main/chunking/splitter";
import { RATE, audio, quiet, speech } from "../helpers/chunking";

/** Pushes `samples` to a fresh splitter in pieces of `piece` samples. */
function cutsOf(samples: Float32Array, piece = samples.length, rate = RATE): Cut[] {
  const splitter = new ChunkSplitter(rate);
  const cuts: Cut[] = [];
  for (let start = 0; start < samples.length; start += piece) {
    cuts.push(...splitter.push(samples.subarray(start, start + piece)));
  }
  return cuts;
}

const ninety = audio(
  speech(21),
  quiet(0.6),
  speech(25),
  quiet(0.4),
  speech(33),
  quiet(0.5),
  speech(9.5),
);
const ninetyCuts: Cut[] = [
  { sample: 338240, rule: "pause" },
  { sample: 747840, rule: "pause" },
  { sample: 1068480, rule: "max" },
];

describe("ChunkSplitter", () => {
  it("cut at a pause after 20 s", () => {
    const samples = audio(speech(22), quiet(0.3));
    const splitter = new ChunkSplitter(RATE);

    expect(splitter.push(samples.subarray(0, 356480))).toEqual([]);
    expect(splitter.push(samples.subarray(356480))).toEqual([{ sample: 354240, rule: "pause" }]);
  });

  it("pause before 20 s makes no cut", () => {
    expect(cutsOf(audio(speech(10), quiet(0.6), speech(5)))).toEqual([]);
  });

  it("pause under way when the chunk reaches 20 s", () => {
    const samples = audio(speech(19), quiet(1));
    const splitter = new ChunkSplitter(RATE);

    expect(splitter.push(samples.subarray(0, 319680))).toEqual([]);
    expect(splitter.push(samples.subarray(319680))).toEqual([{ sample: 317440, rule: "pause" }]);
  });

  it("silent chunk is cut only at 30 s", () => {
    const samples = quiet(30);
    const splitter = new ChunkSplitter(RATE);

    expect(splitter.push(samples.subarray(0, 479680))).toEqual([]);
    expect(splitter.push(samples.subarray(479680))).toEqual([{ sample: 320640, rule: "max" }]);
  });

  it("chunk without a pause is cut at 30 s", () => {
    const samples = speech(30);
    samples.fill(0.05, 384000, 385600);

    expect(cutsOf(samples)).toEqual([{ sample: 384640, rule: "max" }]);
  });

  it("cuts while recording equal cuts on the whole recording", () => {
    expect(cutsOf(ninety)).toEqual(ninetyCuts);
    expect(cutsOf(ninety, 8000)).toEqual(ninetyCuts);
    expect(cutsOf(ninety, 4096)).toEqual(ninetyCuts);
    expect(cutsOf(ninety, 1000)).toEqual(ninetyCuts);
  });

  it("a prefix of the recording gives a prefix of its cuts", () => {
    const prefixCuts = cutsOf(ninety.subarray(0, 960000));

    expect(prefixCuts.length).toBeGreaterThan(0);
    expect(prefixCuts).toEqual(cutsOf(ninety).slice(0, prefixCuts.length));
  });

  it("windows lie wholly inside the last 10 s", () => {
    const samples = speech(30);
    samples.fill(0.01, 318400, 320000);

    expect(cutsOf(samples)).toEqual([{ sample: 320640, rule: "max" }]);
  });

  it("a chunk of quiet frames only gets no pause cut", () => {
    expect(cutsOf(audio(speech(22), quiet(25)))).toHaveLength(1);
  });

  it("a frame is 20 ms at the splitter's sample rate", () => {
    const samples = audio(speech(22, 0.1, 48000), quiet(0.3, 48000));

    expect(cutsOf(samples, samples.length, 48000)).toEqual([{ sample: 1062720, rule: "pause" }]);
  });
});
