import { describe, expect, it } from "vitest";
import {
  hasValidVinCheckDigit,
  hasValidVinFormat,
  normalizeVin,
  tidyMake,
  validateVin,
} from "./vin";

// Real VINs with correct check digits.
// Check digit (position 9) recomputed to be valid — the commonly-quoted
// "5YJ3E1EA7KF317806" fails it, which NHTSA reports as ErrorCode 1.
const TESLA_MODEL_3 = "5YJ3E1EA2KF317806";
const HONDA_ACCORD = "1HGCM82633A004352";

describe("normalizeVin", () => {
  it("uppercases and strips the spacing people paste in", () => {
    expect(normalizeVin(" 5yj3e1ea2kf317806 ")).toBe(TESLA_MODEL_3);
    expect(normalizeVin("1HGCM826-33A004352".replace("-", ""))).toBe(HONDA_ACCORD);
  });
});

describe("hasValidVinFormat", () => {
  it("accepts a well-formed VIN", () => {
    expect(hasValidVinFormat(TESLA_MODEL_3)).toBe(true);
  });

  it("rejects the letters VINs never use", () => {
    // I, O and Q are excluded from the VIN alphabet precisely because they
    // are misread as 1 and 0 — so their presence means a transcription error.
    expect(hasValidVinFormat("5YJ3E1EA2KF31780I")).toBe(false);
    expect(hasValidVinFormat("5YJ3E1EA2KF31780O")).toBe(false);
    expect(hasValidVinFormat("5YJ3E1EA2KF31780Q")).toBe(false);
  });

  it("rejects the wrong length", () => {
    expect(hasValidVinFormat("5YJ3E1EA2KF31780")).toBe(false);
    expect(hasValidVinFormat("5YJ3E1EA2KF3178066")).toBe(false);
  });
});

describe("hasValidVinCheckDigit", () => {
  it("accepts real VINs", () => {
    expect(hasValidVinCheckDigit(TESLA_MODEL_3)).toBe(true);
    expect(hasValidVinCheckDigit(HONDA_ACCORD)).toBe(true);
  });

  it("catches a single mistyped character", () => {
    // The whole point: one wrong digit is the common failure, and it would
    // otherwise return "vehicle not found", which reads to a customer as
    // "you don't stock my car".
    const typo = TESLA_MODEL_3.slice(0, 3) + "4" + TESLA_MODEL_3.slice(4);
    expect(hasValidVinCheckDigit(typo)).toBe(false);
  });

  it("catches transposed characters", () => {
    const swapped =
      TESLA_MODEL_3.slice(0, 10) + TESLA_MODEL_3[11] + TESLA_MODEL_3[10] + TESLA_MODEL_3.slice(12);
    expect(hasValidVinCheckDigit(swapped)).toBe(false);
  });

  it("returns false rather than throwing on malformed input", () => {
    expect(hasValidVinCheckDigit("")).toBe(false);
    expect(hasValidVinCheckDigit("NOT-A-VIN")).toBe(false);
  });
});

describe("validateVin", () => {
  it("accepts a real VIN and reports the check digit passed", () => {
    const result = validateVin(TESLA_MODEL_3.toLowerCase());
    expect(result).toMatchObject({ ok: true, vin: TESLA_MODEL_3, checkDigitValid: true });
  });

  it("explains a wrong length in plain terms", () => {
    const result = validateVin("12345");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/17 characters/);
  });

  it("points at the 1-vs-I confusion specifically", () => {
    const result = validateVin("5YJ3E1EA2KF31780I");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/I, O or Q/);
  });

  it("accepts a VIN that fails the check digit, but flags it", () => {
    // Non-North-American VINs don't always carry a valid check digit, so this
    // is a warning rather than a rejection.
    const typo = TESLA_MODEL_3.slice(0, 3) + "4" + TESLA_MODEL_3.slice(4);
    const result = validateVin(typo);
    expect(result).toMatchObject({ ok: true, checkDigitValid: false });
  });

  it("asks for input rather than erroring on empty", () => {
    const result = validateVin("   ");
    expect(result.ok).toBe(false);
  });
});

describe("tidyMake", () => {
  it("converts NHTSA's shouted make to catalog casing", () => {
    expect(tidyMake("TESLA")).toBe("Tesla");
    expect(tidyMake("MERCEDES-BENZ")).toBe("Mercedes-Benz");
  });

  it("passes through null", () => {
    expect(tidyMake(null)).toBeNull();
  });
});
