// JSON-LD structured data — Phase 2 spec 1.13: "Add Product + Offer schema
// per part and LocalBusiness schema on the homepage."
//
// This is what lets a search result show the price and whether it's in stock
// instead of a bare blue link.
//
// Two rules run through everything here:
//
//   * The price in structured data is ALWAYS the retail price. This markup is
//     read by crawlers and cached by search engines — emitting a trade price
//     because a signed-in wholesale account happened to render the page would
//     publish trade pricing to the entire internet.
//   * Availability is the same three-state label the public site uses; the
//     exact quantity never appears.

import { ADDRESS, BUSINESS_NAME, EMAIL, PHONE_DISPLAY, SITE_URL } from "@/lib/site";

/**
 * Serialises JSON-LD for embedding in a <script> tag.
 *
 * Escapes "<" so a product name containing "</script>" cannot break out of
 * the tag — product text is staff-entered, but this is markup going into a
 * script element and it costs nothing to be safe.
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** schema.org availability from the shop's stock rules. */
export function schemaAvailability(quantity: number, reorderPoint: number): string {
  if (quantity <= 0) return "https://schema.org/OutOfStock";
  if (quantity <= reorderPoint) return "https://schema.org/LimitedAvailability";
  return "https://schema.org/InStock";
}

export type ProductSchemaInput = {
  id: string;
  sku: string;
  name: string;
  description: string;
  make: string;
  image: string | null;
  /** Retail price, always — never the trade price. */
  retailPrice: string;
  quantity: number;
  reorderPoint: number;
  capaCertified: boolean;
};

export function buildProductSchema(product: ProductSchemaInput) {
  const url = `${SITE_URL}/catalog/${product.id}`;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.sku,
    // The vehicle manufacturer the part fits — the useful "brand" for a body
    // panel, which has no manufacturer brand of its own.
    brand: { "@type": "Brand", name: product.make },
    ...(product.image
      ? { image: product.image.startsWith("http") ? product.image : `${SITE_URL}${product.image}` }
      : {}),
    ...(product.capaCertified
      ? {
          additionalProperty: {
            "@type": "PropertyValue",
            name: "Certification",
            value: "CAPA certified",
          },
        }
      : {}),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "USD",
      price: product.retailPrice,
      availability: schemaAvailability(product.quantity, product.reorderPoint),
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "AutoPartsStore", name: BUSINESS_NAME },
    },
  };
}

/**
 * LocalBusiness (AutoPartsStore) for the homepage — the markup that feeds a
 * Google Business panel: address, phone, hours, service area.
 */
export function buildLocalBusinessSchema() {
  // ADDRESS is kept byte-identical to the Google Business listing (see
  // src/lib/site.ts), so it is split rather than re-typed here.
  const [street, city, stateZip] = ADDRESS.split(",").map((part) => part.trim());
  const [region, postalCode] = (stateZip ?? "").split(" ").filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "AutoPartsStore",
    "@id": `${SITE_URL}/#business`,
    name: BUSINESS_NAME,
    url: SITE_URL,
    telephone: PHONE_DISPLAY,
    email: EMAIL,
    image: `${SITE_URL}/ads-logo.jpg`,
    address: {
      "@type": "PostalAddress",
      streetAddress: street,
      addressLocality: city,
      addressRegion: region,
      postalCode,
      addressCountry: "US",
    },
    // Matches HOURS_DISPLAY in src/lib/site.ts. If the shop's hours change,
    // both must change together — see spec 1.15.
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "17:00",
      },
    ],
    areaServed: [
      { "@type": "City", name: "Orlando" },
      { "@type": "State", name: "Florida" },
    ],
  };
}
