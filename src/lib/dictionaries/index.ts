import type { Locale } from "@/lib/i18n";
import { en, type Dictionary } from "./en";
import { es } from "./es";

const DICTIONARIES: Record<Locale, Dictionary> = { en, es };

/**
 * Strings for a locale. Synchronous and statically imported rather than the
 * dynamic-import pattern in the Next docs: both dictionaries together are a
 * few kilobytes, and this keeps every caller a plain function call instead of
 * an await, which matters because they're used inside render.
 */
export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? en;
}

export type { Dictionary };
