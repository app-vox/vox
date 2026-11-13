import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { PROMPT_TEMPLATES } from "../../src/shared/prompt-templates";

const LOCALES_DIR = join(__dirname, "..", "..", "src", "shared", "i18n", "locales");

describe("PROMPT_TEMPLATES", () => {
  it("offers the translation, dual translation and Wikipedia templates", () => {
    const ids = PROMPT_TEMPLATES.map((template) => template.id);
    expect(ids).toEqual(
      expect.arrayContaining(["translate-pt", "translate-de", "translate-en", "translate-en-de", "wikipedia"]),
    );
  });

  it("has unique ids and non-empty instructions and icons", () => {
    const ids = PROMPT_TEMPLATES.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const template of PROMPT_TEMPLATES) {
      expect(template.instructions.trim().length, template.id).toBeGreaterThan(0);
      expect(template.icon.length, template.id).toBeGreaterThan(0);
    }
  });

  it("has a translated name in every locale", () => {
    const files = readdirSync(LOCALES_DIR).filter((file) => file.endsWith(".json"));
    expect(files.length).toBeGreaterThan(1);
    for (const file of files) {
      const messages = JSON.parse(readFileSync(join(LOCALES_DIR, file), "utf-8")) as Record<string, string>;
      for (const template of PROMPT_TEMPLATES) {
        expect(messages[template.nameKey]?.trim().length ?? 0, `${file} ${template.nameKey}`).toBeGreaterThan(0);
      }
    }
  });
});
