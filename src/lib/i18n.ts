// Internationalisation — Phase 2A spec step 10.
//
//   "Full i18n, not just the homepage."
//   "Route-based: /es/... with hreflang tags so Google indexes both."
//   "Translate part type names, statuses, emails, and error messages — not
//    just marketing copy."
//
// URL SHAPE: English stays UNPREFIXED (/catalog) and Spanish is prefixed
// (/es/catalog). Next's documented pattern nests everything under app/[lang],
// which would move every English page to /en/... — breaking every URL Google
// has already indexed, which is the exact problem spec 1.1 is fixing. The
// asymmetric shape keeps existing URLs intact and is what the spec describes.

export const LOCALES = ["en", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/**
 * Request header the proxy sets with the incoming pathname.
 *
 * The root layout is the only place that can set <html lang>, and a layout
 * cannot see the URL. Next's documented answer is app/[lang]/..., which this
 * app deliberately does not use — it would move every English page under /en
 * and break the indexed URLs spec 1.1 exists to protect. So the proxy passes
 * the path forward and the layout reads it from here.
 */
export const PATHNAME_HEADER = "x-pathname";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** Language tags for hreflang. */
export const HREFLANG: Record<Locale, string> = {
  en: "en-US",
  es: "es-US",
};

export const LOCALE_LABEL: Record<Locale, string> = {
  en: "English",
  es: "Español",
};

/**
 * Prefixes a path for a locale. English is unprefixed.
 *
 *   localePath("es", "/catalog")  -> "/es/catalog"
 *   localePath("en", "/catalog")  -> "/catalog"
 *   localePath("es", "/")         -> "/es"
 */
export function localePath(locale: Locale, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return clean;
  return clean === "/" ? "/es" : `/es${clean}`;
}

/** Strips a locale prefix, returning the language-neutral path. */
export function stripLocale(pathname: string): { locale: Locale; path: string } {
  if (pathname === "/es") return { locale: "es", path: "/" };
  if (pathname.startsWith("/es/")) return { locale: "es", path: pathname.slice(3) };
  return { locale: DEFAULT_LOCALE, path: pathname };
}

/**
 * `alternates` for Next metadata: a canonical plus one hreflang entry per
 * language, so Google indexes both and doesn't treat them as duplicates.
 */
export function alternatesFor(locale: Locale, path: string) {
  return {
    canonical: localePath(locale, path),
    languages: {
      [HREFLANG.en]: localePath("en", path),
      [HREFLANG.es]: localePath("es", path),
      // Tells search engines which version to show when no language matches.
      "x-default": localePath("en", path),
    },
  };
}
