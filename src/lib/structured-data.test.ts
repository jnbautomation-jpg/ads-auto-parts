import { describe, expect, it } from "vitest";
import {
  buildLocalBusinessSchema,
  buildProductSchema,
  jsonLdScript,
  schemaAvailability,
} from "./structured-data";
import { ADDRESS, PHONE_DISPLAY } from "./site";

const PRODUCT = {
  id: "abc123",
  sku: "RAV4-19-24-DR-LF",
  name: "2019–2024 Toyota RAV4 Door — Left Front",
  description: "New aftermarket door for a 2019–2024 Toyota RAV4.",
  make: "Toyota",
  image: "/part-images/door.png",
  retailPrice: "469.00",
  quantity: 7,
  reorderPoint: 2,
  capaCertified: true,
};

describe("jsonLdScript", () => {
  it("escapes < so product text cannot break out of the script tag", () => {
    const out = jsonLdScript({ name: "</script><img onerror=alert(1)>" });
    expect(out).not.toContain("</script>");
    expect(out).toContain("\\u003c");
  });

  it("produces parseable JSON", () => {
    expect(JSON.parse(jsonLdScript({ a: 1 }))).toEqual({ a: 1 });
  });
});

describe("schemaAvailability", () => {
  it("maps the shop's stock states onto schema.org values", () => {
    expect(schemaAvailability(0, 2)).toBe("https://schema.org/OutOfStock");
    expect(schemaAvailability(2, 2)).toBe("https://schema.org/LimitedAvailability");
    expect(schemaAvailability(7, 2)).toBe("https://schema.org/InStock");
  });

  it("treats a negative quantity as out of stock", () => {
    expect(schemaAvailability(-1, 2)).toBe("https://schema.org/OutOfStock");
  });
});

describe("buildProductSchema", () => {
  it("emits the fields Google needs for a rich result", () => {
    const schema = buildProductSchema(PRODUCT);
    expect(schema["@type"]).toBe("Product");
    expect(schema.sku).toBe(PRODUCT.sku);
    expect(schema.offers.price).toBe("469.00");
    expect(schema.offers.priceCurrency).toBe("USD");
    expect(schema.offers.availability).toBe("https://schema.org/InStock");
  });

  it("never contains an exact quantity", () => {
    // Same public rule as the catalog: stock level is a label, not a number.
    const serialized = jsonLdScript(buildProductSchema(PRODUCT));
    expect(serialized).not.toMatch(/"quantity"/);
    expect(serialized).not.toMatch(/"reorderPoint"/);
  });

  it("makes image URLs absolute, since crawlers don't resolve relative paths", () => {
    const schema = buildProductSchema(PRODUCT);
    expect(schema.image).toMatch(/^https?:\/\/.+\/part-images\/door\.png$/);
  });

  it("leaves image out entirely when there is none", () => {
    expect(buildProductSchema({ ...PRODUCT, image: null })).not.toHaveProperty("image");
  });

  it("records CAPA certification only when the part carries it", () => {
    expect(buildProductSchema(PRODUCT)).toHaveProperty("additionalProperty");
    expect(buildProductSchema({ ...PRODUCT, capaCertified: false })).not.toHaveProperty(
      "additionalProperty",
    );
  });

  it("uses the vehicle make as the brand", () => {
    // A body panel has no manufacturer brand of its own; the vehicle it fits
    // is the useful signal for a shopper.
    expect(buildProductSchema(PRODUCT).brand).toEqual({ "@type": "Brand", name: "Toyota" });
  });
});

describe("buildLocalBusinessSchema", () => {
  it("splits the Google-matched address into its parts without altering it", () => {
    const schema = buildLocalBusinessSchema();
    expect(schema.address.streetAddress).toBe("6950 Venture Cir");
    expect(schema.address.addressLocality).toBe("Orlando");
    expect(schema.address.addressRegion).toBe("FL");
    expect(schema.address.postalCode).toBe("32807");
    // Rebuilding the string must give back exactly what site.ts holds.
    const rebuilt = `${schema.address.streetAddress}, ${schema.address.addressLocality}, ${schema.address.addressRegion} ${schema.address.postalCode}`;
    expect(rebuilt).toBe(ADDRESS);
  });

  it("carries the shop's phone and opening hours", () => {
    const schema = buildLocalBusinessSchema();
    expect(schema.telephone).toBe(PHONE_DISPLAY);
    expect(schema.openingHoursSpecification[0].opens).toBe("09:00");
    expect(schema.openingHoursSpecification[0].closes).toBe("17:00");
  });

  it("declares the trading name and service area", () => {
    const schema = buildLocalBusinessSchema();
    expect(schema["@type"]).toBe("AutoPartsStore");
    expect(schema.areaServed.map((a) => a.name)).toContain("Orlando");
  });
});
