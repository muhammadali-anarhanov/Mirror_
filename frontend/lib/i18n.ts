import { UI_MESSAGES } from "./translations/ui.ts";
export const LANGUAGE_CODES = ["EN","UZ","RU","KK","AR","TR"] as const;
export type Language = typeof LANGUAGE_CODES[number];
export const LANGUAGE_LOCALES:Record<Language,string>={EN:"en-US",UZ:"uz-UZ",RU:"ru-RU",KK:"kk-KZ",AR:"ar",TR:"tr-TR"};
export function isLanguage(value:unknown):value is Language { return typeof value==="string" && LANGUAGE_CODES.includes(value as Language); }
/** English message IDs are the fallback; merchant-entered data never enters this lookup. */
export type TranslationValues = Record<string,string|number>;
export function translateText(language:Language,key:string,values?:TranslationValues):string {
  let messageKey=key,parameters=values;
  const receipt=/^(\d+) units received into (.+)\. Demo stock updated in this session only\.$/.exec(key);
  const scan=/^Simulated scan matched (.+)\.$/.exec(key);
  if(receipt){messageKey="{count} units received into {branch}. Demo stock updated in this session only.";parameters={count:receipt[1],branch:receipt[2]};}
  else if(scan){messageKey="Simulated scan matched {product}.";parameters={product:scan[1]};}
  const entry=UI_MESSAGES[messageKey];
  const message=entry?.[language] || entry?.EN || messageKey;
  return message.replace(/\{(\w+)\}/g,(token,name)=>parameters?.[name]===undefined?token:String(parameters[name]));
}
