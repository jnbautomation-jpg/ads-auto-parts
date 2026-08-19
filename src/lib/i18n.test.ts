import { describe, expect, it } from "vitest";
import { PartType, PartPosition } from "@/generated/prisma/enums";
import {
  DEFAULT_LOCALE,
  HREFLANG,
  LOCALES,
  alternatesFor,
  isLocale,
  localePath,
  stripLocale,
} from "./i18n";
import { getDictionary } from "./dictionaries";
import { en } from "./dictionaries/en";
import { es } from "./dictionaries/es";
import {
  formatPartTypeIn,
  formatPositionIn,
  getAvailabilityIn,
  formatMoneyIn,
} from "./format";

describe("localePath", () => {
  it("leaves English unprefixed so indexed URLs keep working", () => {
    // Moving English under /en would break every URL Google already has —
    // the exact problem spec 1.1 is fixing.
    expect(localePath("en", "/catalog")).toBe("/catalog");
    expect(localePath("en", "/")).toBe("/");
  });

  it("prefixes Spanish", () => {
    expect(localePath("es", "/catalog")).toBe("/es/catalog");
    expect(localePath("es", "/catalog/abc123")).toBe("/es/catalog/abc123");
  });

  it("maps the Spanish home page to /es, not /es/", () => {
    expect(localePath("es", "/")).toBe("/es");
  });

  it("tolerates a path without a leading slash", () => {
    expect(localePath("es", "catalog")).toBe("/es/catalog");
  });
});

describe("stripLocale", () => {
  it("round-trips with localePath for both locales", () => {
    for (const locale of LOCALES) {
      for (const path of ["/", "/catalog", "/catalog/abc123", "/vin"]) {
        expect(stripLocale(localePath(locale, path))).toEqual({ locale, path });
      }
    }
  });

  it("treats an unprefixed path as the default locale", () => {
    expect(stripLocale("/catalog")).toEqual({ locale: "en", path: "/catalog" });
  });

  it("does not mistake a path merely starting with 'es' for the locale", () => {
    // "/escape" must not be read as locale "es" + path "cape".
    expect(stripLocale("/escape")).toEqual({ locale: "en", path: "/escape" });
  });
});

describe("alternatesFor", () => {
  it("emits an hreflang entry for every locale plus x-default", () => {
    // Without these, Google treats the two languages as duplicate content.
    const alt = alternatesFor("es", "/catalog");
    expect(alt.canonical).toBe("/es/catalog");
    expect(alt.languages[HREFLANG.en]).toBe("/catalog");
    expect(alt.languages[HREFLANG.es]).toBe("/es/catalog");
    expect(alt.languages["x-default"]).toBe("/catalog");
  });

  it("points the canonical at the page's own language", () => {
    expect(alternatesFor("en", "/catalog").canonical).toBe("/catalog");
  });
});

describe("isLocale", () => {
  it("accepts supported locales and rejects anything else", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("es")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale("")).toBe(false);
  });
});

describe("dictionaries", () => {
  it("translates every part type — not just marketing copy", () => {
    // The spec calls out part type names specifically.
    for (const value of Object.values(PartType)) {
      expect(en.partType[value], `English missing ${value}`).toBeTruthy();
      expect(es.partType[value], `Spanish missing ${value}`).toBeTruthy();
      expect(es.partType[value], `${value} left untranslated`).not.toBe(en.partType[value]);
    }
  });

  it("translates every position", () => {
    for (const value of Object.values(PartPosition)) {
      expect(es.position[value], `Spanish missing ${value}`).toBeTruthy();
    }
  });

  it("translates the stock statuses", () => {
    for (const key of ["IN_STOCK", "LOW_STOCK", "CALL"] as const) {
      expect(es.availability[key]).not.toBe(en.availability[key]);
    }
  });

  it("translates error messages", () => {
    for (const key of Object.keys(en.errors) as (keyof typeof en.errors)[]) {
      expect(es.errors[key], `Spanish missing error ${key}`).toBeTruthy();
      expect(es.errors[key], `error ${key} left in English`).not.toBe(en.errors[key]);
    }
  });

  it("falls back to English for an unknown locale rather than crashing", () => {
    expect(getDictionary("de" as never)).toBe(en);
  });
});

describe("locale-aware formatters", () => {
  it("translates part type labels", () => {
    expect(formatPartTypeIn("QUARTER_PANEL", "en")).toBe("Quarter Panel");
    expect(formatPartTypeIn("QUARTER_PANEL", "es")).toBe("Panel lateral");
  });

  it("translates positions, including the empty case", () => {
    expect(formatPositionIn("FRONT_LEFT", "es")).toBe("Delantera izquierda");
    expect(formatPositionIn(null, "es")).toBe("—");
  });

  it("translates availability but keeps the colour", () => {
    const enLabel = getAvailabilityIn(10, 2, "en");
    const esLabel = getAvailabilityIn(10, 2, "es");
    expect(enLabel.label).toBe("IN STOCK");
    expect(esLabel.label).toBe("EN EXISTENCIA");
    expect(esLabel.color).toBe(enLabel.color);
  });

  it("never puts a digit in a translated availability label", () => {
    // Same public rule in both languages: never an exact count.
    for (const locale of LOCALES) {
      for (const [qty, reorder] of [[0, 2], [2, 2], [50, 2]]) {
        expect(getAvailabilityIn(qty, reorder, locale).label).not.toMatch(/\d/);
      }
    }
  });

  it("keeps prices in dollars in both languages", () => {
    // Spanish-speaking customers in Florida still pay USD.
    expect(formatMoneyIn(469, "en")).toContain("469");
    expect(formatMoneyIn(469, "es")).toContain("469");
    expect(formatMoneyIn(469, "es")).toMatch(/\$/);
  });

  it("falls back to the English label for an unknown part type", () => {
    expect(formatPartTypeIn("SPOILER", "es")).toBe("SPOILER");
  });
});

describe("DEFAULT_LOCALE", () => {
  it("is English, which is what the unprefixed URLs serve", () => {
    expect(DEFAULT_LOCALE).toBe("en");
  });
});
