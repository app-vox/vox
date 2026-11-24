import { describe, it, expect } from "vitest";
import { detectGarbage } from "../../src/main/garbage";

const BEFORE = "I looked at the report this morning.";
const AFTER = "After that I called the customer about the delivery date and the invoice.";

describe("detectGarbage", () => {
  it("phrase repeated three times in a row is a loop", () => {
    const text = `${BEFORE} Then we should ship it, then we should ship it, Then we should ship it. ${AFTER}`;

    expect(detectGarbage(text)).toBe("loop");
  });

  it("phrase repeated twice is not a loop", () => {
    const text = `${BEFORE} Then we should ship it, then we should ship it. ${AFTER}`;

    expect(detectGarbage(text)).toBeNull();
  });

  it("repeated single word is not a loop", () => {
    expect(detectGarbage("No, no, no, I will not go there today.")).toBeNull();
  });

  it("today's rules keep their reasons", () => {
    expect(detectGarbage("Um")).toBe("short");
    expect(detectGarbage("Thank you")).toBe("hallucination");
    expect(detectGarbage("Thank you.")).toBeNull();
    expect(detectGarbage("[music]")).toBe("description");
    expect(detectGarbage("Please subscribe to our channel. ".repeat(10).trim())).toBe("loop");
  });
});
