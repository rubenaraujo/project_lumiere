import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { setApiLanguage } from "@/services/tmdb";
import { en, pt, type MessageKey } from "./messages";
import { I18nContext, LOCALES, TMDB_LANGUAGE, type Locale } from "./context";

const STORAGE_KEY = "lumiere.locale";

const dictionaries: Record<Locale, Record<MessageKey, string>> = { pt, en };

const detectLocale = (): Locale => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (LOCALES.includes(stored as Locale)) {
      return stored as Locale;
    }
  } catch {
    // localStorage unavailable (private mode, etc.): fall back to the browser.
  }
  return navigator.language?.toLowerCase().startsWith("en") ? "en" : "pt";
};

export const I18nProvider = ({ children, initialLocale }: { children: ReactNode; initialLocale?: Locale }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const initial = initialLocale ?? detectLocale();
    // Must be set before any query runs for the first render.
    setApiLanguage(TMDB_LANGUAGE[initial]);
    return initial;
  });

  const setLocale = useCallback((next: Locale) => {
    setApiLanguage(TMDB_LANGUAGE[next]);
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Persisting the choice is best-effort.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback(
    (key: MessageKey, params?: Record<string, string | number>) => {
      const template = dictionaries[locale][key];
      if (!params) return template;
      return template.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`));
    },
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};
