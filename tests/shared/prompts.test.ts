import { describe, it, expect } from "vitest";
import { createDefaultConfig, type Prompt, type VoxConfig } from "../../src/shared/config";
import { activeInstructions, findActivePrompt, nextPromptId } from "../../src/shared/prompts";

const cleanup: Prompt = { id: "a", name: "Cleanup", icon: "🧹", instructions: "  Remove filler words.  " };
const blank: Prompt = { id: "b", name: "Blank", icon: "📝", instructions: "   " };
const german: Prompt = { id: "c", name: "Translate to German", icon: "🇩🇪", instructions: "Translate to German." };

function withPrompts(prompts: Prompt[], activePromptId: string | null): VoxConfig {
  return { ...createDefaultConfig(), prompts, activePromptId };
}

describe("findActivePrompt", () => {
  it("returns the prompt whose id is active, blank or not", () => {
    expect(findActivePrompt(withPrompts([cleanup, blank], "b"))).toBe(blank);
  });

  it("returns null for None or an unknown id", () => {
    expect(findActivePrompt(withPrompts([cleanup], null))).toBeNull();
    expect(findActivePrompt(withPrompts([cleanup], "gone"))).toBeNull();
  });
});

describe("activeInstructions", () => {
  it("returns the trimmed text of the active prompt", () => {
    expect(activeInstructions(withPrompts([cleanup, german], "a"))).toBe("Remove filler words.");
  });

  it("returns null for None, an unknown id or a blank prompt", () => {
    expect(activeInstructions(withPrompts([cleanup], null))).toBeNull();
    expect(activeInstructions(withPrompts([cleanup], "gone"))).toBeNull();
    expect(activeInstructions(withPrompts([cleanup, blank], "b"))).toBeNull();
  });
});

describe("nextPromptId", () => {
  it("nextPromptId steps past a blank active prompt", () => {
    expect(nextPromptId(withPrompts([cleanup, blank, german], "b"))).toBe("c");
  });

  it("goes from None to the first prompt and from the last back to None", () => {
    expect(nextPromptId(withPrompts([cleanup, blank, german], null))).toBe("a");
    expect(nextPromptId(withPrompts([cleanup, blank, german], "c"))).toBeNull();
  });

  it("treats an unknown id as None", () => {
    expect(nextPromptId(withPrompts([cleanup, german], "gone"))).toBe("a");
  });

  it("stays at None when there are no prompts", () => {
    expect(nextPromptId(withPrompts([], null))).toBeNull();
  });
});
