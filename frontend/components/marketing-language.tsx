"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { LANGUAGE_CODES, LANGUAGE_LOCALES, isLanguage, type Language, type TranslationValues, translateText } from "@/lib/i18n";

export const marketingLanguages = LANGUAGE_CODES;
export type MarketingLanguage = Language;
type LanguageContextValue = { language: Language; setLanguage: (language: Language) => void };
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function MarketingLanguageProvider({ children, initialLanguage = "EN" }: { children: ReactNode; initialLanguage?: Language }) {
  const [language,setLanguageState] = useState<Language>(initialLanguage);
  const setLanguage=useCallback((next:Language)=> {
    if(!isLanguage(next))return;
    setLanguageState(next);
    document.cookie=`mirror_language=${next}; Max-Age=31536000; Path=/; SameSite=Lax`;
  },[]);
  useEffect(()=> {
    // Legacy admin links represent an explicit language choice; migrate them to
    // the same cookie used everywhere else, without a second language store.
    const query=new URLSearchParams(window.location.search).get("lang")?.toUpperCase();
    const stored=document.cookie.split("; ").find(c=>c.startsWith("mirror_language="))?.split("=")[1];
    if(!isLanguage(stored) && isLanguage(query))setLanguage(query);
  },[setLanguage]);
  useEffect(()=> {
    document.documentElement.lang=LANGUAGE_LOCALES[language];
    document.documentElement.dir=language==="AR"?"rtl":"ltr";
  },[language]);
  useEffect(()=> {
    const validatable=(node:EventTarget|null):node is HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement => node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement;
    const reset=(event:Event)=> {if(validatable(event.target))event.target.setCustomValidity("");};
    const invalid=(event:Event)=> {
      const field=event.target;if(!validatable(field))return;
      field.setCustomValidity("");
      const v=field.validity;
      const key=v.valueMissing?"Please complete this field.":v.typeMismatch?(field instanceof HTMLInputElement && field.type==="email"?"Enter a valid email address.":"Enter a valid web address."):v.tooShort?"This value is too short.":v.rangeOverflow||v.rangeUnderflow?"Enter a value within the allowed range.":"Enter a valid value.";
      field.setCustomValidity(translateText(language,key));
    };
    document.addEventListener("invalid",invalid,true);document.addEventListener("input",reset,true);document.addEventListener("change",reset,true);
    return()=> {document.removeEventListener("invalid",invalid,true);document.removeEventListener("input",reset,true);document.removeEventListener("change",reset,true);};
  },[language]);
  const value=useMemo(()=>({language,setLanguage}),[language,setLanguage]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export function useMarketingLanguage() {
  const value=useContext(LanguageContext);
  if(!value)throw new Error("Language provider is required");
  return value;
}
export function useText() {
  const {language}=useMarketingLanguage();
  return useCallback((key:string,values?:TranslationValues)=>translateText(language,key,values),[language]);
}
export function LanguageSelector({className,id}:{className?:string;id?:string}) {
  const {language,setLanguage}=useMarketingLanguage();const t=useText();
  return <select id={id} className={className} aria-label={t("Choose language")} value={language} onChange={e=>setLanguage(e.target.value as Language)}>{LANGUAGE_CODES.map(code=><option key={code} value={code}>{code}</option>)}</select>;
}
