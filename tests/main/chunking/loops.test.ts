import { describe, it, expect } from "vitest";
import { collapseLoops, findPhraseRun, hasPhraseLoop } from "../../../src/main/chunking/loops";

describe("collapseLoops", () => {
  it("collapse keeps the first occurrence", () => {
    const text =
      "We met on Monday. The plan is ready, the plan is ready, The plan is ready. the plan is ready, the plan is ready. Then we left.";

    expect(collapseLoops(text)).toBe("We met on Monday. The plan is ready, Then we left.");
  });

  it("the shortest phrase wins", () => {
    expect(collapseLoops("a b c a b c a b c a b c a b c a b c")).toBe("a b c");
  });

  it("collapsing repeats until no run is left", () => {
    const text = "a b c a b c a b c d a b c a b c a b c d a b c a b c a b c d";

    expect(collapseLoops(text)).toBe("a b c d");
  });

  it("a phrase repeated twice is left", () => {
    const text = "go to the shop, go to the shop. Then home.";

    expect(collapseLoops(text)).toBe(text);
    expect(hasPhraseLoop(text)).toBe(false);
  });

  it("a repeated single word is left", () => {
    const text = "No, no, no, I will not go there today.";

    expect(collapseLoops(text)).toBe(text);
    expect(hasPhraseLoop(text)).toBe(false);
  });

  it("a run cut off in mid-phrase keeps the cut-off words", () => {
    expect(collapseLoops("a b c a b c a b c a b")).toBe("a b c a b");
  });
});

describe("findPhraseRun", () => {
  it("words compare without case and punctuation", () => {
    expect(hasPhraseLoop("Ship it now, SHIP IT NOW! ship it now")).toBe(true);
    expect(findPhraseRun(["ship", "it", "now", "ship", "it", "now", "ship", "it", "now"])).toEqual({
      start: 0,
      words: 3,
      repeats: 3,
    });
  });
});
