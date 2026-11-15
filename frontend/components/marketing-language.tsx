"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export const marketingLanguages = ["UZ", "EN", "RU", "KK", "AR"] as const;
export type MarketingLanguage = (typeof marketingLanguages)[number];

type MarketingLanguageContextValue = {
  language: MarketingLanguage;
  setLanguage: (language: MarketingLanguage) => void;
};

const locales: Record<MarketingLanguage, string> = {
  UZ: "uz-UZ",
  EN: "en-US",
  RU: "ru-RU",
  KK: "kk-KZ",
  AR: "ar",
};

const MarketingLanguageContext = createContext<MarketingLanguageContextValue | null>(null);

function isMarketingLanguage(value: string | undefined): value is MarketingLanguage {
  return marketingLanguages.some((language) => language === value);
}

export function MarketingLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<MarketingLanguage>("UZ");

  useEffect(() => {
    const savedLanguage = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith("mirror_language="))
      ?.split("=")[1];

    if (isMarketingLanguage(savedLanguage)) {
      setLanguageState(savedLanguage);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locales[language];
    document.documentElement.dir = language === "AR" ? "rtl" : "ltr";
  }, [language]);

  const setLanguage = useCallback((nextLanguage: MarketingLanguage) => {
    setLanguageState(nextLanguage);
    document.cookie = `mirror_language=${nextLanguage}; Max-Age=31536000; Path=/; SameSite=Lax`;
  }, []);

  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);

  return <MarketingLanguageContext.Provider value={value}>{children}</MarketingLanguageContext.Provider>;
}

export function useMarketingLanguage() {
  const context = useContext(MarketingLanguageContext);
  if (!context) {
    throw new Error("useMarketingLanguage must be used within MarketingLanguageProvider");
  }
  return context;
}
