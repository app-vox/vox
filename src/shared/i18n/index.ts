import type { SupportedLanguage } from "../config";
import en from "./locales/en.json";
import ptBR from "./locales/pt-BR.json";
import ptPT from "./locales/pt-PT.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import it from "./locales/it.json";
import ru from "./locales/ru.json";
import tr from "./locales/tr.json";

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  "en", "pt-BR", "pt-PT", "es", "fr", "de", "it", "ru", "tr",
];

const translations: Record<SupportedLanguage, Record<string, string>> = {
  en, "pt-BR": ptBR, "pt-PT": ptPT, es, fr, de, it, ru, tr,
};

let currentLanguage: SupportedLanguage = "en";

export function setLanguage(lang: SupportedLanguage): void {
  currentLanguage = lang;
}

export function getLanguage(): SupportedLanguage {
  return currentLanguage;
}

export function t(key: string, params?: Record<string, string | number>): string {
  const text = translations[currentLanguage]?.[key] ?? translations.en[key] ?? key;
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`));
}

const LANGUAGE_MAPPING: Record<string, SupportedLanguage> = {
  en: "en", "en-US": "en", "en-GB": "en", "en-AU": "en",
  pt: "pt-BR", "pt-BR": "pt-BR", "pt-PT": "pt-PT",
  es: "es", "es-ES": "es", "es-MX": "es", "es-AR": "es",
  fr: "fr", "fr-FR": "fr", "fr-CA": "fr",
  de: "de", "de-DE": "de", "de-AT": "de", "de-CH": "de",
  it: "it", "it-IT": "it",
  ru: "ru", "ru-RU": "ru",
  tr: "tr", "tr-TR": "tr",
};

export function resolveSystemLanguage(locale: string): SupportedLanguage {
  if (LANGUAGE_MAPPING[locale]) return LANGUAGE_MAPPING[locale];
  const base = locale.split("-")[0];
  if (LANGUAGE_MAPPING[base]) return LANGUAGE_MAPPING[base];
  return "en";
}
