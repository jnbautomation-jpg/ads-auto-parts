import type { Metadata } from "next";
import { alternatesFor, localePath, type Locale } from "@/lib/i18n";
import { BUSINESS_NAME, SITE_URL } from "@/lib/site";

// og:locale uses an underscore where hreflang uses a hyphen.
const OG_LOCALE: Record<Locale, string> = {
  en: "en_US",
  es: "es_US",
};

const DEFAULT_SHARE_IMAGE = "/ads-logo.jpg";

/**
 * Title, description, hreflang and social card for one public page.
 *
 * Two things this exists to prevent, both of which were live:
 *
 * 1. Next does not deep-merge `openGraph` — a page that sets it REPLACES the
 *    layout's object entirely. Pages that set `openGraph: { url, title }` to
 *    fix the URL silently dropped og:image, og:site_name and og:type, so
 *    every share of those pages previewed with no picture.
 * 2. A Spanish page that sets no `openGraph` inherits the layout's, which is
 *    English down to `og:locale: en_US`. Shared to WhatsApp — where a good
 *    part of this shop's Spanish-speaking trade actually happens — a Spanish
 *    page previewed as an English one.
 */
export function pageMetadata(
  locale: Locale,
  /** Language-neutral path, e.g. "/catalog". */
  path: string,
  {
    title,
    description,
    images = [DEFAULT_SHARE_IMAGE],
    robots,
  }: {
    title: string;
    description: string;
    images?: string[];
    /**
     * For pages that exist for one visitor and have nothing to index — the
     * cart, the checkout, the order confirmation. Left undefined everywhere
     * else so the site-wide default still applies.
     */
    robots?: Metadata["robots"];
  },
): Metadata {
  return {
    title,
    description,
    ...(robots ? { robots } : {}),
    alternates: alternatesFor(locale, path),
    openGraph: {
      type: "website",
      siteName: BUSINESS_NAME,
      locale: OG_LOCALE[locale],
      url: `${SITE_URL}${localePath(locale, path)}`,
      title,
      description,
      images,
    },
    twitter: { card: "summary_large_image", title, description, images },
  };
}
