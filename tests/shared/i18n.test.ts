import { describe, it, expect, beforeEach } from "vitest";
import { t, setLanguage, getLanguage, SUPPORTED_LANGUAGES, resolveSystemLanguage } from "../../src/shared/i18n";
import en from "../../src/shared/i18n/locales/en.json";
import ptBR from "../../src/shared/i18n/locales/pt-BR.json";
import ptPT from "../../src/shared/i18n/locales/pt-PT.json";
import es from "../../src/shared/i18n/locales/es.json";
import fr from "../../src/shared/i18n/locales/fr.json";
import de from "../../src/shared/i18n/locales/de.json";
import itIT from "../../src/shared/i18n/locales/it.json";
import ru from "../../src/shared/i18n/locales/ru.json";
import tr from "../../src/shared/i18n/locales/tr.json";
import pl from "../../src/shared/i18n/locales/pl.json";

const allTranslations = { en, "pt-BR": ptBR, "pt-PT": ptPT, es, fr, de, it: itIT, pl, ru, tr };

describe("i18n", () => {
  beforeEach(() => {
    setLanguage("en");
  });

  it("should return English text by default", () => {
    expect(t("tabs.general")).toBe("General");
  });

  it("should return key if translation is missing", () => {
    expect(t("nonexistent.key")).toBe("nonexistent.key");
  });

  it("should switch languages", () => {
    setLanguage("pt-BR");
    expect(t("tabs.general")).toBe("Geral");
    setLanguage("en");
    expect(t("tabs.general")).toBe("General");
  });

  it("should interpolate parameters", () => {
    expect(t("general.about.readyToInstall", { version: "1.2.3" })).toBe("Vox v1.2.3 is ready to install");
  });

  it("should have all supported languages", () => {
    expect(SUPPORTED_LANGUAGES).toEqual(["en", "pt-BR", "pt-PT", "es", "fr", "de", "it", "pl", "ru", "tr"]);
  });

  it("should resolve system locale to supported language", () => {
    expect(resolveSystemLanguage("en-US")).toBe("en");
    expect(resolveSystemLanguage("pt-BR")).toBe("pt-BR");
    expect(resolveSystemLanguage("pt")).toBe("pt-BR");
    expect(resolveSystemLanguage("pt-PT")).toBe("pt-PT");
    expect(resolveSystemLanguage("es-MX")).toBe("es");
    expect(resolveSystemLanguage("fr-FR")).toBe("fr");
    expect(resolveSystemLanguage("de-DE")).toBe("de");
    expect(resolveSystemLanguage("it-IT")).toBe("it");
    expect(resolveSystemLanguage("pl")).toBe("pl");
    expect(resolveSystemLanguage("pl-PL")).toBe("pl");
    expect(resolveSystemLanguage("ru-RU")).toBe("ru");
    expect(resolveSystemLanguage("tr-TR")).toBe("tr");
    expect(resolveSystemLanguage("ja-JP")).toBe("en");
    expect(resolveSystemLanguage("zh-CN")).toBe("en");
  });

  it("should get current language", () => {
    setLanguage("fr");
    expect(getLanguage()).toBe("fr");
  });

  it("should have the same keys across all translations", () => {
    const enKeys = Object.keys(en).sort();
    for (const lang of SUPPORTED_LANGUAGES) {
      if (lang === "en") continue;
      const langKeys = Object.keys(allTranslations[lang]).sort();
      expect(langKeys, `${lang} has different keys than en`).toEqual(enKeys);
    }
  });

  it("should have no empty values in any translation", () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      const trans = allTranslations[lang];
      for (const [key, value] of Object.entries(trans)) {
        expect(value, `${lang}.${key} is empty`).not.toBe("");
      }
    }
  });
});
