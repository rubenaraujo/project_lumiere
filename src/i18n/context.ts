import { createContext } from "react";
import type { MessageKey } from "./messages";

export type Locale = "pt" | "en";

export const LOCALES: Locale[] = ["pt", "en"];

// Language sent to TMDb for titles, synopses and genre names.
export const TMDB_LANGUAGE: Record<Locale, string> = {
  pt: "pt-PT",
  en: "en-US",
};

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
}

export const I18nContext = createContext<I18nContextValue | null>(null);
