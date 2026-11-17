import type { Language } from "./i18n.ts";
import { mirrorDemoProductNames } from "./mirror-locale.ts";
type NamedProduct = { id: string; name: string; demo?: boolean; nameTranslations?: Partial<Record<Language,string>> };
/** Merchant names are content, not interface message IDs. */
export function localizedProductName(product:NamedProduct,language:Language) {
  return product.nameTranslations?.[language] ?? (product.demo ? mirrorDemoProductNames[product.id]?.[language] ?? product.name : product.name);
}
