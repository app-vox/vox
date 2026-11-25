/**
 * The samples of `blocks` (the recorder window's 4096-sample blocks, in order)
 * from sample `offset` on. Its source text runs inside the recorder window, so
 * it has no import and no closure and uses plain `for` loops.
 */
export function recordedSamplesFrom(blocks: ArrayLike<number>[], offset: number): number[] {
  const out: number[] = [];
  let start = 0;
  for (let b = 0; b < blocks.length; b++) {
    const block = blocks[b];
    const end = start + block.length;
    if (end > offset) {
      for (let i = offset > start ? offset - start : 0; i < block.length; i++) {
        out.push(block[i]);
      }
    }
    start = end;
  }
  return out;
}
