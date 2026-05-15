"use client";

import { createContext, useContext, useCallback, useState } from "react";
import { translate, LOCALES, DEFAULT_LOCALE } from "@/lib/i18n";

const Ctx = createContext({
  lang: DEFAULT_LOCALE,
  setLang: () => {},
  t: (k) => k,
});

export function LangProvider({ initialLang = DEFAULT_LOCALE, children }) {
  const [lang, setLangState] = useState(LOCALES.includes(initialLang) ? initialLang : DEFAULT_LOCALE);

  const setLang = useCallback((next) => {
    if (!LOCALES.includes(next)) return;
    setLangState(next);
    // 1-year cookie so the choice persists across SSR loads.
    document.cookie = `lang=${next}; max-age=${60 * 60 * 24 * 365}; path=/; samesite=lax`;
    document.documentElement.setAttribute("lang", next);
  }, []);

  const t = useCallback((key, vars) => translate(key, lang, vars), [lang]);

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);
