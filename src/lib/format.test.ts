import { describe, expect, it } from "vitest";
import { PartType } from "@/generated/prisma/enums";
import {
  PART_SLUG_LABELS,
  PART_SLUG_TO_TYPES,
  PART_TYPE_LABELS,
  formatFit,
  formatMoney,
  formatPartType,
  formatPosition,
  getAvailability,
} from "./format";

// The public site must never show an exact quantity — only these three
// labels. Getting this wrong leaks stock levels to competitors, so the
// boundaries are pinned explicitly.
describe("getAvailability", () => {
  it("returns CALL when nothing is on hand", () => {
    expect(getAvailability(0, 2)).toEqual({ label: "CALL", color: "#6A7178" });
  });

  it("returns CALL for a negative quantity rather than falling through", () => {
    expect(getAvailability(-1, 2).label).toBe("CALL");
  });

  it("returns LOW STOCK at exactly the reorder point", () => {
    expect(getAvailability(2, 2)).toEqual({ label: "LOW STOCK", color: "#A65A07" });
  });

  it("returns IN STOCK one above the reorder point", () => {
    expect(getAvailability(3, 2)).toEqual({ label: "IN STOCK", color: "#1B7A3B" });
  });

  it("treats a zero reorder point as in stock for any positive quantity", () => {
    expect(getAvailability(1, 0).label).toBe("IN STOCK");
  });

  it("never returns a label containing a digit", () => {
    // Guards the rule directly: no code path may put a count in the label.
    for (const [qty, reorder] of [
      [0, 0],
      [1, 5],
      [50, 2],
      [999, 1000],
    ]) {
      expect(getAvailability(qty, reorder).label).not.toMatch(/\d/);
    }
  });
});

describe("formatFit", () => {
  it("collapses an identical start and end year to a single year", () => {
    expect(formatFit("Kia", "K5", 2021, 2021)).toBe("2021 Kia K5");
  });

  it("renders a real range with an en dash", () => {
    expect(formatFit("Kia", "K5", 2020, 2023)).toBe("2020–2023 Kia K5");
  });
});

describe("formatPartType", () => {
  it("labels every PartType in the enum", () => {
    // Catches the case where a new enum value is added to the schema but
    // never given a human label — the raw enum would leak to the public site.
    for (const value of Object.values(PartType)) {
      expect(PART_TYPE_LABELS[value], `missing label for ${value}`).toBeTruthy();
    }
  });

  it("never returns a raw underscored enum value for a known type", () => {
    expect(formatPartType("RADIATOR_SUPPORT")).toBe("Radiator Support");
    expect(formatPartType("REAR_BODY_PANEL")).toBe("Rear Body");
  });

  it("falls back to the input for an unknown type instead of throwing", () => {
    expect(formatPartType("SPOILER")).toBe("SPOILER");
  });
});

describe("formatPosition", () => {
  it("renders a dash for a missing position", () => {
    expect(formatPosition(null)).toBe("—");
    expect(formatPosition(undefined)).toBe("—");
    expect(formatPosition("")).toBe("—");
  });

  it("reorders the enum into shop language", () => {
    expect(formatPosition("FRONT_LEFT")).toBe("Left Front");
    expect(formatPosition("REAR_RIGHT")).toBe("Right Rear");
  });
});

describe("formatMoney", () => {
  it("formats numbers and numeric strings identically", () => {
    expect(formatMoney(1234.5)).toBe("$1,234.50");
    expect(formatMoney("1234.5")).toBe("$1,234.50");
  });
});

// The landing page tiles and the catalog filter both key off these slugs.
// If they drift apart, a tile links to a category that renders nothing.
describe("part slug maps", () => {
  it("has a label for every slug that maps to part types", () => {
    for (const slug of Object.keys(PART_SLUG_TO_TYPES)) {
      expect(PART_SLUG_LABELS[slug], `missing label for slug ${slug}`).toBeTruthy();
    }
  });

  it("has part types for every labelled slug", () => {
    for (const slug of Object.keys(PART_SLUG_LABELS)) {
      expect(PART_SLUG_TO_TYPES[slug], `missing types for slug ${slug}`).toBeTruthy();
    }
  });

  it("only maps to real PartType enum values", () => {
    const valid = new Set<string>(Object.values(PartType));
    for (const [slug, types] of Object.entries(PART_SLUG_TO_TYPES)) {
      for (const type of types) {
        expect(valid.has(type), `slug ${slug} maps to unknown type ${type}`).toBe(true);
      }
    }
  });

  it("covers every PartType across all slugs", () => {
    // Every part type the shop can stock should be reachable from the
    // browse-by-part navigation — otherwise inventory becomes unbrowsable.
    const covered = new Set(Object.values(PART_SLUG_TO_TYPES).flat());
    for (const value of Object.values(PartType)) {
      expect(covered.has(value), `no slug reaches ${value}`).toBe(true);
    }
  });
});
