import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Lang, TranslationKey } from "./i18n";
import { translations } from "./i18n";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
  dir: "ltr" | "rtl";
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getSavedLang(): Lang {
  try {
    const saved = localStorage.getItem("esteraha_lang");
    if (saved === "ar" || saved === "en") return saved;
  } catch {
    // localStorage blocked in some environments — fall through
  }
  return "ar"; // default Arabic
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getSavedLang);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    try {
      localStorage.setItem("esteraha_lang", newLang);
    } catch {
      // ignore
    }
    const newDir = newLang === "ar" ? "rtl" : "ltr";
    document.documentElement.dir = newDir;
    document.documentElement.lang = newLang;
  }, []);

  // Apply on mount
  useEffect(() => {
    const dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback(
    (key: TranslationKey): string => {
      return (translations[lang] as Record<string, string>)[key] ?? (translations.en as Record<string, string>)[key] ?? key;
    },
    [lang],
  );

  const dir: "ltr" | "rtl" = lang === "ar" ? "rtl" : "ltr";

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

export function useT() {
  return useLanguage().t;
}
