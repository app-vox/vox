import { createContext, useContext, useMemo, type ReactNode } from "react";
import { t as translate, setLanguage, resolveSystemLanguage } from "../shared/i18n";
import type { SupportedLanguage } from "../shared/config";
import { useConfigStore } from "./stores/config-store";

interface I18nContextValue {
  t: typeof translate;
  language: SupportedLanguage;
}

const I18nContext = createContext<I18nContextValue>({
  t: translate,
  language: "en",
});

export function useT() {
  return useContext(I18nContext).t;
}

export function useLanguage() {
  return useContext(I18nContext).language;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const configLanguage = useConfigStore((s) => s.config?.language ?? "system");

  const resolvedLanguage = useMemo<SupportedLanguage>(() => {
    let lang: SupportedLanguage;
    if (configLanguage === "system") {
      const systemLocale = navigator.language || "en";
      lang = resolveSystemLanguage(systemLocale);
    } else {
      lang = configLanguage;
    }
    setLanguage(lang);
    return lang;
  }, [configLanguage]);

  return (
    <I18nContext.Provider value={{ t: translate, language: resolvedLanguage }}>
      {children}
    </I18nContext.Provider>
  );
}
