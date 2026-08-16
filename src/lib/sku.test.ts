import { describe, expect, it } from "vitest";
import { generateSkuBase } from "./sku";

// generateSkuBase must stay deterministic and DB-free: the admin form renders
// a live preview on the client and the server re-derives the same value.
describe("generateSkuBase", () => {
  it("builds the documented example", () => {
    expect(
      generateSkuBase({
        model: "K5",
        yearStart: 2020,
        yearEnd: 2023,
        partType: "DOOR",
        position: "REAR_LEFT",
      }),
    ).toBe("K5-20-23-DR-LR");
  });

  it("omits the position segment when there is no position", () => {
    expect(
      generateSkuBase({ model: "Camry", yearStart: 2018, yearEnd: 2022, partType: "HOOD" }),
    ).toBe("CAMR-18-22-HD");
  });

  it("truncates the model code to four alphanumeric characters", () => {
    expect(
      generateSkuBase({ model: "Grand Cherokee", yearStart: 2015, yearEnd: 2020, partType: "FENDER" }),
    ).toBe("GRAN-15-20-FD");
  });

  it("strips punctuation before truncating", () => {
    // "CR-V" has only three alphanumerics — the hyphen must not consume a slot.
    expect(
      generateSkuBase({ model: "CR-V", yearStart: 2017, yearEnd: 2022, partType: "DOOR" }),
    ).toBe("CRV-17-22-DR");
  });

  it("falls back to GEN when the model has no alphanumerics", () => {
    expect(
      generateSkuBase({ model: "???", yearStart: 2020, yearEnd: 2020, partType: "GRILLE" }),
    ).toBe("GEN-20-20-GR");
  });

  it("pads single-digit year codes", () => {
    expect(
      generateSkuBase({ model: "Civic", yearStart: 2005, yearEnd: 2009, partType: "BUMPER" }),
    ).toBe("CIVI-05-09-BP");
  });

  it("returns an empty string when required input is missing", () => {
    expect(generateSkuBase({ model: "", yearStart: 2020, yearEnd: 2023, partType: "DOOR" })).toBe("");
    expect(generateSkuBase({ model: "  ", yearStart: 2020, yearEnd: 2023, partType: "DOOR" })).toBe("");
    expect(generateSkuBase({ model: "K5", yearStart: 0, yearEnd: 2023, partType: "DOOR" })).toBe("");
  });

  it("is deterministic across repeated calls", () => {
    const input = {
      model: "Rogue",
      yearStart: 2019,
      yearEnd: 2024,
      partType: "QUARTER_PANEL",
      position: "FRONT_RIGHT",
    } as const;
    expect(generateSkuBase(input)).toBe(generateSkuBase(input));
  });
});
