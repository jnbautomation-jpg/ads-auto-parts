import { describe, expect, it } from "vitest";
import { findPartTypes, findVin, parseEstimateText } from "./estimate";

// Shaped like a real CCC/Mitchell estimate: header block, vehicle block, then
// numbered line items.
const ESTIMATE = `
CCC ONE Estimate
Claim #: A0293847561ZQ    Policy: PLC00918273645
Insured: Jane Doe        RO Number: 55231

2019 TESLA MODEL 3
VIN: 5YJ3E1EA2KF317806        Mileage: 41,203

Line  Description                         Part Type   Price
1     L/H FRONT DOOR SHELL                Repl        612.00
2     Front Bumper Cover                  Repl        438.50
3     R/H FENDER                          Repl        290.00
4     Refinish adjacent panel             Labor        88.00
5     GRILLE, UPPER                       Repl        142.00
`;

describe("findVin", () => {
  it("picks the VIN out of an estimate full of long reference numbers", () => {
    // Claim and policy numbers are also long alphanumerics; the check digit
    // is what separates a real VIN from them.
    const found = findVin(ESTIMATE);
    expect(found).toEqual({ vin: "5YJ3E1EA2KF317806", checkDigitValid: true });
  });

  it("returns null when there is no VIN at all", () => {
    expect(findVin("Claim 12345\nTotal 900.00")).toBeNull();
  });

  it("reports a failing check digit rather than silently trusting it", () => {
    // Non-North-American VINs don't always carry a valid check digit, so this
    // is surfaced to the shop rather than rejected.
    const typo = "5YJ3E1EA7KF317806";
    const found = findVin(`VIN: ${typo}`);
    expect(found).toEqual({ vin: typo, checkDigitValid: false });
  });

  it("does not match a 17-char run inside a longer code", () => {
    expect(findVin("REF ABCDEFGHJKLMNPRST1234567890")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(findVin("vin 5yj3e1ea2kf317806")?.vin).toBe("5YJ3E1EA2KF317806");
  });
});

describe("findPartTypes", () => {
  it("reads the parts off the line items", () => {
    expect(findPartTypes(ESTIMATE)).toEqual(["DOOR", "BUMPER", "FENDER", "GRILLE"]);
  });

  it("does not repeat a part type that appears twice", () => {
    expect(findPartTypes("Front door\nRear door")).toEqual(["DOOR"]);
  });

  it("skips lines it doesn't recognise rather than guessing", () => {
    expect(findPartTypes("Refinish adjacent panel\nHazardous waste disposal")).toEqual([]);
  });

  it("matches line by line, so one stray word can't claim the whole document", () => {
    const doc = "Sublet: paint\n".repeat(50) + "L/H DOOR";
    expect(findPartTypes(doc)).toEqual(["DOOR"]);
  });

  it("ignores absurdly long lines", () => {
    expect(findPartTypes("door " + "x".repeat(300))).toEqual([]);
  });
});

describe("parseEstimateText", () => {
  it("pulls vehicle and parts out of a whole estimate", () => {
    const parsed = parseEstimateText(ESTIMATE);
    expect(parsed.vin).toBe("5YJ3E1EA2KF317806");
    expect(parsed.vinCheckDigitValid).toBe(true);
    expect(parsed.partTypes).toContain("DOOR");
    expect(parsed.looksScanned).toBe(false);
  });

  it("flags a PDF with no text layer as a scan instead of returning nothing", () => {
    // A scanned estimate would otherwise look like an empty estimate, and the
    // shop would think the upload silently failed.
    const parsed = parseEstimateText("   ");
    expect(parsed.looksScanned).toBe(true);
    expect(parsed.vin).toBeNull();
  });
});
