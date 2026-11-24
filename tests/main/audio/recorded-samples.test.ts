import { describe, expect, it } from "vitest";
import { recordedSamplesFrom } from "../../../src/main/audio/recorded-samples";

const BLOCK = 4096;

/** Ten blocks of 4096 samples whose values count up from 0. */
function countingBlocks(): number[][] {
  return Array.from({ length: 10 }, (_, b) =>
    Array.from({ length: BLOCK }, (_, i) => b * BLOCK + i),
  );
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from }, (_, i) => from + i);
}

describe("recordedSamplesFrom", () => {
  it("the samples from the offset on are returned", () => {
    const blocks = countingBlocks();
    const fromMiddle = recordedSamplesFrom(blocks, 32000);
    expect(fromMiddle).toHaveLength(8960);
    expect(fromMiddle).toEqual(range(32000, 40960));
    expect(recordedSamplesFrom(blocks, 0)).toEqual(range(0, 40960));
  });

  it("an offset at the end returns no samples", () => {
    expect(recordedSamplesFrom(countingBlocks(), 40960)).toEqual([]);
  });

  it("no blocks return no samples", () => {
    expect(recordedSamplesFrom([], 0)).toEqual([]);
  });

  it("its source text runs on its own", () => {
    const standalone = new Function("return (" + recordedSamplesFrom.toString() + ")")() as typeof recordedSamplesFrom;
    expect(standalone(countingBlocks(), 5000)).toEqual(range(5000, 40960));
  });
});
